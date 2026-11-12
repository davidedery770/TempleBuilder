"""Build a local display catalog using Dicta's public Nakdan; no runtime requests.

Only authored game copy from collect-niqqud.mjs is submitted, in polite sequential
batches. Existing source pointing, consonants, punctuation and save IDs are kept.
"""
import collections
import difflib
import json
import re
import time
import urllib.request
from pathlib import Path
import truststore

truststore.inject_into_ssl()
ROOT=Path(__file__).resolve().parent.parent
CACHE=ROOT/"tmp"/"niqqud-cache.json"
MARKS=re.compile(r"[\u0591-\u05bd\u05bf-\u05c7]")
WORD=re.compile(r"[\u05d0-\u05ea][\u0591-\u05bd\u05bf-\u05c7\u05d0-\u05ea]*")
ENDPOINT="https://nakdan-2-0.loadbalancer.dicta.org.il/api"
MANUAL_WORDS={"פלאשבקים":"פְלָאשְׁבֶּקִים"}
def bare(word):
    return MARKS.sub("",word)
def pointed_word(source,target):
    if source in MANUAL_WORDS:
        return MANUAL_WORDS[source]
    if MARKS.search(source):
        return source
    a=bare(source); b=bare(target)
    if a==b:
        return target
    clusters=re.findall(r"[\u05d0-\u05ea][\u0591-\u05bd\u05bf-\u05c7]*",target)
    output=[]
    for tag,i,j,k,l in difflib.SequenceMatcher(a=a,b=b,autojunk=False).get_opcodes():
        if tag=="equal":
            output.extend(clusters[k:l])
        elif tag=="delete" and all(c in "וי" for c in a[i:j]):
            for ch in a[i:j]:
                if ch=="ו" and output and "\u05bb" in output[-1]:
                    output[-1]=output[-1].replace("\u05bb","")
                    output.append("וּ")
                else:
                    output.append(ch)
        elif tag=="insert" and all(c in "וי" for c in b[k:l]):
            for cluster in clusters[k:l]:
                vowels=MARKS.findall(cluster)
                if output and vowels:
                    output[-1]+="\u05bb" if "\u05bc" in vowels else "".join(vowels)
        else:
            raise ValueError(f"Consonants differ: {source!r} => {target!r}")
    return "".join(output)
def preserve(source,pointed):
    original=list(WORD.finditer(source)); result=list(WORD.finditer(pointed))
    if len(original)!=len(result):
        raise ValueError(f"Vocalizer changed the Hebrew consonants: {source!r} => {pointed!r}")
    pieces=[];last=0
    for old,new in zip(original,result):
        pieces.append(source[last:old.start()])
        pieces.append(pointed_word(old.group(),new.group()))
        last=old.end()
    pieces.append(source[last:])
    return "".join(pieces)
def request(text):
    payload={"task":"nakdan","genre":"modern","data":text,"addmorph":False,"keepqq":False}
    req=urllib.request.Request(ENDPOINT,data=json.dumps(payload,ensure_ascii=False).encode("utf-8"),
        headers={"Content-Type":"application/json; charset=utf-8","Accept":"application/json"})
    with urllib.request.urlopen(req,timeout=75) as response:
        tokens=json.loads(response.read().decode("utf-8"))
    if not isinstance(tokens,list):
        raise ValueError("Unexpected vocalization response")
    return "".join((t.get("options") or [t["word"]])[0].replace("|","") if not t.get("sep")
                   else t["word"] for t in tokens)
def main():
    sources=json.loads((ROOT/"tmp"/"niqqud-sources.json").read_text(encoding="utf-8"))
    cache=json.loads(CACHE.read_text(encoding="utf-8")) if CACHE.exists() else {}
    review_path=ROOT/"tmp"/"niqqud-review.json"
    review=json.loads(review_path.read_text(encoding="utf-8")) if review_path.exists() else {}
    pending=[s for s in sources if s not in cache and any(len(w)>1 and not MARKS.search(w) for w in WORD.findall(s))]
    for s in sources:
        if s not in cache and s not in pending:
            cache[s]=s
    completed=0
    while pending:
        batch=[];size=0
        while pending and (not batch or size+len(pending[0])<4500):
            s=pending.pop(0);batch.append(s);size+=len(s)+1
        output=request("\n".join(batch)).strip("\n").split("\n")
        if len(output)!=len(batch):
            output=[request(s) for s in batch]
        for source,pointed in zip(batch,output):
            try:
                cache[source]=preserve(source,pointed)
            except ValueError:
                try:
                    cache[source]=preserve(source,request(source))
                except ValueError as error:
                    cache[source]=source
                    review[source]=str(error)
        CACHE.write_text(json.dumps(cache,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
        review_path.write_text(json.dumps(review,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
        completed+=len(batch)
        print(f"Vocalized {completed}; remaining {len(pending)}",flush=True)
        time.sleep(0.35)
    counts=collections.defaultdict(collections.Counter)
    for source in sources:
        for word in WORD.findall(cache[source]):
            if MARKS.search(word):
                counts[bare(word)][word]+=1
    words={key:counter.most_common(1)[0][0] for key,counter in counts.items()}
    # Authored terms and proper names take precedence over statistical fallback.
    words.update({"בצלאל":"בְּצַלְאֵל","אהליאב":"אָהֳלִיאָב","משה":"מֹשֶׁה","אהרן":"אַהֲרֹן",
        "חושן":"חֹשֶׁן","החושן":"הַחֹשֶׁן","שיטים":"שִׁטִּים","שילה":"שִׁילֹה","שמן":"שֶׁמֶן",
        "מנורה":"מְנוֹרָה","תכלת":"תְּכֵלֶת","ארגמן":"אַרְגָּמָן","שש":"שֵׁשׁ"})
    words.update(MANUAL_WORDS)
    for source in sources:
        cache[source]=WORD.sub(lambda m: m.group() if MARKS.search(m.group()) else words.get(m.group(),m.group()),cache[source])
    out="// Generated by tools/generate-niqqud.py; Dicta-assisted, local display only.\n"
    out+="export const NIQQUD_PHRASES = "+json.dumps({s:cache[s] for s in sources},ensure_ascii=False,indent=2)+";\n"
    out+="export const NIQQUD_WORDS = "+json.dumps(words,ensure_ascii=False,indent=2)+";\n"
    (ROOT/"src"/"data"/"niqqud.generated.js").write_text(out,encoding="utf-8")
    print(f"READY: {len(sources)} phrases, {len(words)} local fallback words.",flush=True)
    print(f"Alignment review entries: {len(review)}",flush=True)
if __name__=="__main__":
    main()
