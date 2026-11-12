"""Generate only the three preview lines. Requires edge-tts 7.3.1 and truststore.

Run with the isolated tmp/voice-preview-env Python. Text is sent to Microsoft's
online speech service; playback uses only the resulting local MP3 files.
"""
import asyncio
import hashlib
import json
import shutil
import subprocess
from pathlib import Path

import truststore
truststore.inject_into_ssl()  # Use verified Windows certificate trust; never disable TLS checks.
import edge_tts

ROOT = Path(__file__).resolve().parent.parent
FOLDER = ROOT / "assets" / "audio" / "voice-preview"


async def main():
    manifest_path = FOLDER / "sample.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    ffmpeg = shutil.which("ffmpeg")
    ffprobe = shutil.which("ffprobe")
    if not ffmpeg or not ffprobe:
        raise RuntimeError("ffmpeg and ffprobe are needed to validate and normalize this sample")
    voices = await asyncio.wait_for(edge_tts.list_voices(), timeout=30)
    if not any(v["ShortName"] == manifest["voice"] for v in voices):
        raise RuntimeError("Requested Hebrew voice is not available")
    files = []
    for line in manifest["lines"]:
        output = FOLDER / line["file"]
        partial = FOLDER / (line["id"] + ".partial.mp3")
        print("Generating " + line["id"], flush=True)
        communicate = edge_tts.Communicate(line["text"], manifest["voice"], rate=manifest["rate"])
        await asyncio.wait_for(communicate.save(str(partial)), timeout=60)
        if partial.stat().st_size < 1000:
            raise RuntimeError("Speech service returned an empty preview")
        subprocess.run([ffmpeg, "-hide_banner", "-loglevel", "error", "-y", "-i", str(partial),
                        "-af", "loudnorm=I=-19:TP=-3:LRA=7", "-c:a", "libmp3lame", "-b:a", "96k", str(output)], check=True)
        info = subprocess.check_output([ffprobe, "-v", "error", "-show_entries", "format=duration",
                                        "-of", "json", str(output)], text=True)
        line["duration"] = round(float(json.loads(info)["format"]["duration"]), 3)
        line["sha256"] = hashlib.sha256(output.read_bytes()).hexdigest()
        line["text_sha256"] = hashlib.sha256(line["text"].encode("utf-8")).hexdigest()
        files.append(output)
        partial.unlink()  # Only this script's intermediate audio, never source/user files.
        print(f"Saved {output.name}: {line['duration']:.1f}s", flush=True)
    command = [ffmpeg, "-hide_banner", "-loglevel", "error", "-y"]
    for file in files:
        command += ["-i", str(file)]
    command += ["-filter_complex",
                "[0:a]apad=pad_dur=0.65[a0];[1:a]apad=pad_dur=0.65[a1];[a0][a1][2:a]concat=n=3:v=0:a=1[out]",
                "-map", "[out]", "-c:a", "libmp3lame", "-b:a", "96k", str(ROOT / "Hebrew-Voice-Sample.mp3")]
    subprocess.run(command, check=True)
    manifest["generation_tool"] = "edge-tts 7.3.1"
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print("Hebrew-Voice-Sample.mp3 and 3 individual preview clips are ready.", flush=True)


if __name__ == "__main__":
    asyncio.run(main())
