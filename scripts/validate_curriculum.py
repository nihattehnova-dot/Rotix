#!/usr/bin/env python3
import json
from pathlib import Path

root = Path(__file__).resolve().parents[1] / "assets" / "data" / "curriculum"
files = sorted(p for p in root.rglob("*.json") if not p.name.startswith("_"))
bad = []
total = 0
by_files = {}
by_out = {}
for f in files:
    try:
        d = json.loads(f.read_text(encoding="utf-8"))
        n = sum(len(t["outcomes"]) for u in d["units"] for t in u["topics"])
        total += n
        part = f.relative_to(root).parts[0]
        by_files[part] = by_files.get(part, 0) + 1
        by_out[part] = by_out.get(part, 0) + n
        assert "grade" in d and "subject" in d and "units" in d
    except Exception as e:
        bad.append((str(f.relative_to(root)), str(e)))

print(f"files={len(files)} outcomes={total}")
print("files by folder:", by_files)
print("outcomes by folder:", by_out)
print("bad:", bad or "none")

samples = [
    "middle/grade_7_math.json",
    "middle/grade_8_science.json",
    "middle/grade_8_social_studies.json",
    "high/grade_9_math.json",
    "exams/lgs_matematik.json",
    "exams/ayt_fizik.json",
    "exams/tyt_matematik.json",
    "exams/tyt_turkce.json",
]
for rel in samples:
    d = json.loads((root / rel).read_text(encoding="utf-8"))
    n = sum(len(t["outcomes"]) for u in d["units"] for t in u["topics"])
    print(f"{rel}: grade={d['grade']!r} subject={d['subject']} units={len(d['units'])} outcomes={n}")
