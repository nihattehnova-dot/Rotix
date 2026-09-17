# Mimari Kararlar — Ödeme Öncesi (Kilitlendi)

## Platform
- **Tek Flutter kod tabanı → iOS + Android + Web.** Ayrı React site yok (MVP maliyetini 2–3× artırır).
- Web = pazarlama landing + giriş + öğrenci/veli paneli + akşam tekrarı.
- Ödeme: kendi sanal POS (entegrasyon ertelendi). **3 gün deneme** zorunlu.

## Maliyet kuralları
1. Anlatım = `curriculum` önbelleği (TTS + canvas JSON) — Gemini yok.
2. Gemini Flash yalnızca Sokratik / foto-soru / plan üretimi.
3. Realtime: WebSocket sonra; WebRTC ve canlı insan öğretmen **yok** (MVP).
4. Veli: önce **uygulama içi panel**; WhatsApp/SMS cron sonra.
5. Auth: Supabase Auth (e-posta/telefon); MVP’de `X-User-Id` devam, JWT’ye geçiş hazır.

## Rakiplerden alınan (düşük maliyet / yüksek fayda)

| Özellik | Kaynak | Bizde nasıl |
|---------|--------|-------------|
| Fotoğraflı soru → rehberlik | Kunduz / Doping Çözücü | Gemini Vision → Sokratik (cevap yok) |
| Kişisel çalışma planı | Kunduz koç / Doping takvim | Günlük plan API + kurallar + nadir LLM |
| Konu/eksik analitiği | Hepsi | `topic_mastery` + hata defteri |
| Mikro test (anlatım sonrası) | Doping | `curriculum` sonrası quiz endpoint |
| Veli paneli | Doping Veli | Aynı app, `role=parent` |
| Hedef + sınav geri sayım | Sınav odaklı UX | `learning_goals` |
| Günlük check-in / motivasyon | Doping “Her güne 1” | `daily_checkins` |
| Yazma koçu (lise) | Khanmigo | Sokratik `mode=writing` (sonra) |

## Bilinçli ertelenenler
- 7/24 canlı eğitmen, basılı set kargo, Türkiye geneli deneme kulübü, NestJS, ayrı veli uygulaması, WebRTC.

## Abonelik (kilitlendi)
- Trial: **7 gün**, bitince **kilit**
- Ödeme: **VakıfPayS Web POS only** (Store yok) — **merchant ertelendi**
- Yıllık: 12 ay hizmet, müşteriye **10 × aylık** toplam
- E-arşiv fatura: zorunlu (`invoices` kuyruğu) — **entegratör ertelendi**
- Detay: `docs/BILLING.md`
