"""Generate the game's local speech library with the isolated preview environment.

Only authored game text is sent to Microsoft's online speech service. Playback
does not contact that service. Run prepare-voices.mjs first; reruns reuse receipts.
"""
import asyncio
import hashlib
import json
import shutil
import subprocess
from pathlib import Path

import truststore
truststore.inject_into_ssl()
import edge_tts

ROOT = Path(__file__).resolve().parent.parent
FOLDER = ROOT / "assets" / "audio" / "voices"
RECEIPTS = FOLDER / "generation.json"


def validate(path, ffmpeg, ffprobe):
    subprocess.run([ffmpeg, "-v", "error", "-i", str(path), "-f", "null", "-"],
                   check=True, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)
    info = subprocess.check_output([ffprobe, "-v", "error", "-show_entries",
                                   "format=duration", "-of", "json", str(path)], text=True)
    duration = float(json.loads(info)["format"]["duration"])
    if not 0.1 < duration < 180:
        raise ValueError("Invalid speech duration")
    return round(duration, 3)


async def main():
    manifest = json.loads((FOLDER / "manifest.json").read_text(encoding="utf-8"))
    receipts = json.loads(RECEIPTS.read_text(encoding="utf-8")) if RECEIPTS.exists() else {}
    ffmpeg, ffprobe = shutil.which("ffmpeg"), shutil.which("ffprobe")
    if not ffmpeg or not ffprobe:
        raise RuntimeError("ffmpeg and ffprobe are required")
    available = await asyncio.wait_for(edge_tts.list_voices(), 30)
    if not {line["voice"] for line in manifest["lines"]}.issubset({v["ShortName"] for v in available}):
        raise RuntimeError("A requested Hebrew voice is unavailable")
    limit = asyncio.Semaphore(2)
    completed = 0
    failures = []

    def save_receipts():
        temporary = RECEIPTS.with_suffix(".pending.json")
        temporary.write_text(json.dumps(receipts, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        temporary.replace(RECEIPTS)

    async def generate(line):
        nonlocal completed
        async with limit:
            output = FOLDER / line["file"]
            previous = receipts.get(line["id"], {})
            if line.get("manualFile"):
                if not output.is_file():
                    failures.append(line["id"])
                    print(f"MISSING MANUAL RECORDING: {line['file']}", flush=True)
                    return
                duration = await asyncio.to_thread(validate, output, ffmpeg, ffprobe)
                receipts[line["id"]] = {
                    "signature": line["signature"], "file": line["file"], "duration": duration,
                    "sha256": hashlib.sha256(output.read_bytes()).hexdigest(), "tool": "manual recording",
                }
                save_receipts()
                completed += 1
                return
            if (output.exists() and previous.get("signature") == line["signature"]
                    and previous.get("sha256") == hashlib.sha256(output.read_bytes()).hexdigest()):
                completed += 1
                return
            partial = FOLDER / (line["id"] + ".tts.partial.mp3")
            normalized = FOLDER / (line["id"] + ".normalized.partial.mp3")
            for attempt in range(4):
                try:
                    speech = edge_tts.Communicate(line.get("spokenText", line["text"]), line["voice"],
                                                  rate=line["rate"], pitch=line["pitch"])
                    await asyncio.wait_for(speech.save(str(partial)), timeout=90)
                    if partial.stat().st_size < 500:
                        raise ValueError("Empty speech response")
                    command = [ffmpeg, "-hide_banner", "-loglevel", "error", "-y", "-i", str(partial),
                               "-af", "loudnorm=I=-19:TP=-3:LRA=7", "-ar", "24000",
                               "-c:a", "libmp3lame", "-b:a", "80k", str(normalized)]
                    await asyncio.to_thread(subprocess.run, command, check=True, stderr=subprocess.PIPE)
                    duration = await asyncio.to_thread(validate, normalized, ffmpeg, ffprobe)
                    normalized.replace(output)
                    receipts[line["id"]] = {
                        "signature": line["signature"], "file": line["file"], "duration": duration,
                        "sha256": hashlib.sha256(output.read_bytes()).hexdigest(),
                        "tool": "edge-tts " + edge_tts.__version__,
                    }
                    save_receipts()
                    completed += 1
                    if completed % 10 == 0 or completed <= 3:
                        print(f"Ready {completed}/{len(manifest['lines'])}: {line['profile']} ({duration:.1f}s)", flush=True)
                    break
                except Exception as error:
                    if attempt == 3:
                        failures.append(line["id"])
                        print(f"FAILED {line['id']}: {type(error).__name__}: {error}", flush=True)
                    else:
                        await asyncio.sleep(2 ** attempt + 1)
                finally:
                    # Only this tool's disposable intermediate files.
                    for temporary in (partial, normalized):
                        if temporary.exists():
                            temporary.unlink()

    print(f"Preparing {len(manifest['lines'])} clips (2 concurrent requests, resumable).", flush=True)
    await asyncio.gather(*(generate(line) for line in manifest["lines"]))
    if failures:
        raise RuntimeError(f"{len(failures)} clips failed; rerun to retry only missing clips")
    print(f"COMPLETE: {completed} clips available; all newly generated MP3s decoded successfully.", flush=True)


if __name__ == "__main__":
    asyncio.run(main())
