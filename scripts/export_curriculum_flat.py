#!/usr/bin/env python3
"""Flatten curriculum JSON → Flutter asset + optional SQL seed (topic level)."""
from __future__ import annotations

import hashlib
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CUR = ROOT / "assets" / "data" / "curriculum"
FLAT_OUT = CUR / "_index_flat.json"
FLUTTER_OUT = ROOT / "app_frontend" / "assets" / "data" / "curriculum_flat.json"
SQL_OUT = ROOT / "supabase" / "seed" / "009_curriculum_from_json.sql"


def stable_uuid(key: str) -> str:
    h = hashlib.sha256(key.encode("utf-8")).hexdigest()
    return f"{h[:8]}-{h[8:12]}-5{h[13:16]}-a{h[17:20]}-{h[20:32]}"


def walk_json(folder: Path):
    for p in sorted(folder.rglob("*.json")):
        if p.name.startswith("_"):
            continue
        yield p


def flatten() -> list[dict]:
    items: list[dict] = []
    for path in walk_json(CUR):
        data = json.loads(path.read_text(encoding="utf-8"))
        grade = data.get("grade")
        subject = data.get("subject")
        if grade is None or not subject:
            continue
        for unit in data.get("units") or []:
            for topic in unit.get("topics") or []:
                outcomes = topic.get("outcomes") or []
                kws: list[str] = []
                for o in outcomes:
                    kws.extend(o.get("keywords") or [])
                # dedupe preserve order
                seen = set()
                keywords = []
                for k in kws:
                    if k not in seen:
                        seen.add(k)
                        keywords.append(k)
                key = f"{grade}|{subject}|{topic.get('topic_name')}"
                items.append(
                    {
                        "id": stable_uuid(key),
                        "grade": grade,
                        "subject": subject,
                        "topic": topic.get("topic_name"),
                        "description": " · ".join(
                            o.get("description", "") for o in outcomes if o.get("description")
                        )
                        or None,
                        "estimated_minutes": 10,
                        "unit_name": unit.get("unit_name"),
                        "outcome_codes": [o.get("code") for o in outcomes if o.get("code")],
                        "keywords": keywords,
                        "program_ref": data.get("program_ref"),
                        "source": "json",
                        "file": str(path.relative_to(CUR)).replace("\\", "/"),
                    }
                )
    return items


def sql_escape(s: str) -> str:
    return s.replace("'", "''")


def write_sql(items: list[dict]) -> None:
    # Only numeric grades 1–12 fit public.curriculum.grade check
    grade_items = [i for i in items if isinstance(i["grade"], int) and 1 <= i["grade"] <= 12]
    lines = [
        "-- Auto-generated from assets/data/curriculum JSON (topic level)",
        "-- Run: python scripts/export_curriculum_flat.py",
        "-- Idempotent via ON CONFLICT (grade, subject, topic)",
        "",
        "insert into public.curriculum (",
        "  id, grade, subject, topic, description,",
        "  cached_audio_url, cached_canvas_json, estimated_minutes, is_active",
        ") values",
    ]
    values = []
    for i in grade_items:
        desc = i.get("description") or ""
        # keep SQL size reasonable
        if len(desc) > 500:
            desc = desc[:497] + "..."
        values.append(
            "("
            f"'{i['id']}', "
            f"{i['grade']}, "
            f"'{sql_escape(i['subject'])}', "
            f"'{sql_escape(i['topic'])}', "
            f"'{sql_escape(desc)}', "
            "null, "
            "'[]'::jsonb, "
            f"{i['estimated_minutes']}, "
            "true"
            ")"
        )
    lines.append(",\n".join(values))
    lines.append("on conflict (grade, subject, topic) do update set")
    lines.append("  description = excluded.description,")
    lines.append("  estimated_minutes = excluded.estimated_minutes,")
    lines.append("  is_active = true,")
    lines.append("  updated_at = now();")
    lines.append("")
    SQL_OUT.parent.mkdir(parents=True, exist_ok=True)
    SQL_OUT.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"SQL: {SQL_OUT} ({len(grade_items)} grade rows; exams skipped)")


def main() -> None:
    items = flatten()
    payload = {
        "generated_by": "scripts/export_curriculum_flat.py",
        "topic_count": len(items),
        "items": items,
    }
    FLAT_OUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    FLUTTER_OUT.parent.mkdir(parents=True, exist_ok=True)
    FLUTTER_OUT.write_text(json.dumps(payload, ensure_ascii=False) + "\n", encoding="utf-8")
    write_sql(items)
    print(f"Flat: {FLAT_OUT} ({len(items)} topics)")
    print(f"Flutter: {FLUTTER_OUT}")


if __name__ == "__main__":
    main()
