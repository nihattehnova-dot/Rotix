# Yol Haritası — MVP TAMAMLANDI

## Ürün (ödeme hariç)

- [x] Flutter iOS/Android/Web tek kod tabanı
- [x] Akşam tekrarı + beyaz tahta + ses görselleştirici
- [x] Sokratik Gemini (cevap vermez) + LaTeX/canvas
- [x] Hata defteri SR 1/3/7/14/30
- [x] Kota (günlük dk / aylık soru)
- [x] Günlük plan (kural motoru), konu ustalığı, check-in
- [x] Fotoğraflı soru (Vision → Sokratik)
- [x] Veli paneli (uygulama içi)
- [x] Curriculum önbellek → tahta çizimi
- [x] Mikro test UI
- [x] WebSocket tahta senkronu (`/ws`)
- [x] Supabase Auth JWT + bootstrap
- [x] 7 gün deneme modeli (gate prod’da açılır)
- [x] Veli rapor cron iskeleti (`PARENT_REPORT_CRON`)
- [x] Demo user + curriculum seed

## Yayın (web)

Detay: [`docs/YAYIN.md`](./YAYIN.md)

- [ ] API Docker → Render (`render.yaml`)
- [ ] Flutter `build web` + HTTPS host
- [ ] CORS + Auth prod ayarları
- [ ] Duman testi

## Ertelendi (harici hesap gerekir)

- [ ] VakıfPayS merchant → ödeme canlı
- [ ] E-arşiv entegratörü
- [ ] WhatsApp/SMS API anahtarları → rapor gönderimi
- [ ] WebRTC ses (WebSocket yeterli şimdilik)

## Seed / migration sırası

`001` → `002` → `003` → `004` → seed `005` → seed `006`

Demo öğrenci: `X-User-Id: 00000000-0000-0000-0000-000000000001`
