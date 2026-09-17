# Rakip Gap → Ürün Kararları

Kaynaklar: **Kunduz**, **Khanmigo**, **Doping Hafıza**.

## Aldığımız (MVP, düşük maliyet)

| Özellik | Rakip | Uygulama |
|---------|-------|----------|
| Sokratik rehberlik (cevap yok) | Khanmigo | `POST /api/ai/socratic` |
| Fotoğraflı soru | Kunduz / Doping Çözücü | `POST /api/learning/photo-question` (Vision→Sokratik) |
| Günlük kişisel plan | Kunduz koç / Doping takvim | Kural motoru (LLM yok) |
| Eksik konu haritası | Hepsi | `topic_mastery` |
| Mikro test | Doping | `micro_quizzes` |
| Veli paneli | Doping Veli app | Aynı Flutter, `role=parent` |
| Günlük check-in + motivasyon kartı | Doping “Her güne 1” | `daily_checkins` |
| Hedef / sınav track | Sınav UX | `learning_goals` + onboarding |
| 3 gün deneme | SaaS standart | `trial_*` + `402` guard |

## Bilinçli almadığımız (pahalı)

- 7/24 canlı insan öğretmen
- Basılı kitap / kargo soru bankası
- Türkiye geneli deneme kulübü (sonra)
- Ayrı veli mobil uygulaması
- Canlı grup dersi / WebRTC (WebSocket sonrası)
- NestJS / ayrı React marketing sitesi

## Ödeme kararları (kilitlendi)

1. POS: **VakıfPayS** (web HPP)
2. Yıllık = 10 × aylık (12 ay kullanım) — `docs/BILLING.md`
3. Deneme: **7 gün**, sonra kilit
4. Yalnızca web POS
5. E-arşiv zorunlu
