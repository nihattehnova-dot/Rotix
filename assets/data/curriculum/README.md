# Rotix Curriculum Layout

```
assets/data/curriculum/
  primary/   (grades 1–4)
  middle/    (grades 5–8)
  high/      (grades 9–12)
  exams/     (LGS, TYT, AYT)
  _index_flat.json  (üretilmiş)
```

## Schema

`grade` · `subject` · `units[]` → `unit_code` · `unit_name` · `topics[]` → `topic_name` · `outcomes[]` → `code` · `description` · `keywords[]`

Sınav dosyalarında: `exam_meta` + unit `typical_questions`.

## Uygulama bağlantısı

| Katman | Nasıl |
|--------|--------|
| API | `GET /api/learning/curriculum?grade=7` veya `?exam=TYT` — JSON katalog |
| Flutter | `curriculum_flat.json` + `CurriculumCatalog` (API yedek) |
| Supabase | `seed/009_curriculum_from_json.sql` (opsiyonel, 1–12) |

```bash
python scripts/export_curriculum_flat.py
python scripts/validate_curriculum.py
```

## Durum (~78 müfredat dosyası · ~2180 kazanım · ~809 konu)

### İlkokul / Ortaokul / Lise
MEB kodlarıyla detaylı — `primary/`, `middle/`, `high/` (README önceki tablolar geçerli).

### Sınav (`exams/`)

| Dosya | grade | Durum |
|-------|-------|-------|
| `lgs_turkce.json` | LGS | ✅ |
| `lgs_matematik.json` | LGS | ✅ |
| `lgs_fen.json` | LGS | ✅ |
| `lgs_inkilap.json` | LGS | ✅ |
| `lgs_din.json` | LGS | ✅ |
| `lgs_ingilizce.json` | LGS | ✅ |
| `tyt_matematik.json` | TYT | ✅ |
| `tyt_turkce.json` | TYT | ✅ |
| `tyt_fen.json` | TYT | ✅ |
| `tyt_sosyal.json` | TYT | ✅ |
| `ayt_matematik.json` | AYT | ✅ |
| `ayt_fizik.json` | AYT | ✅ |
| `ayt_kimya.json` | AYT | ✅ |
| `ayt_biyoloji.json` | AYT | ✅ |
| `ayt_edebiyat.json` | AYT | ✅ |
| `ayt_tarih.json` | AYT | ✅ |
| `ayt_cografya.json` | AYT | ✅ |

## Sonraki adımlar

1. JSON değişince `export_curriculum_flat.py` + API restart
2. (İsteğe bağlı) 009 seed’i Supabase’e uygula
3. pgvector RAG için outcome gömme
