# Rotix PRD V2 — Ürün Özeti

Kaynak: `eğitim projesi.docx` (güncel vizyon)

## Çekirdek (3 sütun)

| Sütun | Açıklama | Durum |
|-------|----------|--------|
| **Soru sor** | Sesli/yazılı soru → canlı tahta + yönlendirici ipuçları (Gemini) | ✅ |
| **Ödev kontrolü** | Fotoğraf / metin → tek soru seç → tahtada çözüm | ✅ |
| **Unutma eğrisi** | Zorlanılan sorular → 3 / 10 / 30 gün tekrar (kota harcamaz) | ✅ backend · kısmen UI |

## Kaldırılan / yapılmayan

- ❌ Önceden yazılmış **ders anlatımı** (`script_text`, önbellek anlatım, hazır MP3)
- ❌ Mikro test akışı (ana ürün dışı; kod duruyor ama menüden çıkarıldı)
- ❌ WhatsApp veli bildirimi → yerine **Pazar e-posta karnesi** (planlı)

## Müfredat

- JSON: `assets/data/curriculum/` (MEB/ÖSYM konu iskeleti, telifli PDF kopyası değil)
- Uygulama: konu etiketi + RAG bağlamı için kullanılacak (pgvector — planlı)
- Supabase `curriculum` tablosu: konu meta; **anlatım metni artık zorunlu değil**

## Ses

- Soru çözümünde **canlı TTS** (Gemini veya tarayıcı yedek) — ipucu okuma
- Hazır ders sesi üretimi / depolama yok

## Çoklu profil (planlı)

1 veli hesabı → çoklu çocuk profili → ortak soru kotası → bağımsız unutma defteri

## Paketler (PRD)

| Paket | Soru | Hafıza tekrarı |
|-------|------|----------------|
| Başlangıç | 100/ay | Sınırsız |
| Standart | 250/ay | Sınırsız |
| Yoğun LGS/YKS | 500/ay | Sınırsız |

## Sıradaki sprintler

1. Veli + çoklu profil ekranları
2. Unutma Defteri tam ekran (Ekran 5)
3. Müfredat JSON → Supabase import + pgvector
4. Ortaokul / lise / LGS / AYT JSON dosyaları
5. Pazar e-posta karnesi
