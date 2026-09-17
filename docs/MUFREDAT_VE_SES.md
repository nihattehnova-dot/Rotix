# Müfredat rehberi (PRD V2)

## Amaç

MEB / ÖSYM **konu ve kazanım iskeleti** — telifli PDF veya ders kitabı metni kopyalanmaz.

## Dosya yapısı

```
assets/data/curriculum/
  primary/    (1–4)
  middle/     (5–8)
  high/       (9–12)
  exams/      (LGS, TYT, AYT)
  _index_flat.json   (üretilmiş konu indeksi)
```

Şema: `grade` · `subject` · `units[]` → `topics[]` → `outcomes[]` (`code`, `description`, `keywords`)

## Uygulamaya bağlantı

1. **API (birincil)** — `GET /api/learning/curriculum?grade=7`  
   JSON klasörünü okur (`api_backend/src/services/curriculumCatalog.ts`).  
   Sınav: `?exam=TYT` / `LGS` / `AYT`  
   Ders listesi: `GET /api/learning/curriculum/subjects?grade=7`

   Soru eşleme: anahtar kelime → gerekirse Gemini ikinci tur (`resolveQuestionTopic`).
   Hata defteri: konu birleştirme + `/api/mistakes/due` (grouped) + `/api/mistakes/gaps`.

2. **Flutter (yedek)** — `app_frontend/assets/data/curriculum_flat.json`  
   API yoksa `CurriculumCatalog` ile offline konu seçimi.

3. **Supabase (opsiyonel seed)** — `supabase/seed/009_curriculum_from_json.sql`  
   Yalnızca 1–12. sınıf konu satırları (`grade` smallint).

### Üretim komutları

```bash
python scripts/export_curriculum_flat.py   # flat JSON + SQL seed
python scripts/validate_curriculum.py      # JSON doğrulama
```

İsteğe bağlı: `CURRICULUM_ROOT` env ile JSON klasör yolu.

## Ne için kullanılır?

- Soru / Sokratik oturumda **otomatik ders/konu eşlemesi** (`topicMatcher`)
- Hata defterinde **konuya göre birleştirme** (aynı konudan gereksiz tekrar yok)
- Veli raporunda **eksik/zayıf konu listesi** (`gapTopics`)
- AI bağlamına **sınıf seviyesi + kazanım kodları**
- İleride: pgvector RAG

## Ne için kullanılmaz?

- ❌ Hazır ders anlatım metni (`script_text`)
- ❌ Önceden kaydedilmiş ses / video ders

## Yeni konu ekleme

1. İlgili JSON dosyasına `unit` / `topic` / `outcome` ekle
2. `python scripts/export_curriculum_flat.py` çalıştır
3. API’yi yeniden başlat (katalog bellekte cache’lenir)

## Ses (soru anında)

Geçerli `GEMINI_API_KEY` → `/api/ai/speak` ile ipucu okunur.  
Detay: `docs/GEMINI_SES.md`
