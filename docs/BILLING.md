# Faturalandırma & VakıfPayS

> **Durum: ERTELENDİ** — VakıfPayS merchant ve e-arşiv entegratörü henüz alınmadı. Kod hazır; canlıya geçince `.env` doldurulur.

## Deneme
- **7 gün (1 hafta)** ücretsiz
- Süre bitince ürün API’leri **kilitlenir** (`402 TRIAL_OR_SUBSCRIPTION_REQUIRED`)
- Paket satın alınca `subscription_status = active`

## Kanal
- **Yalnızca Web POS** (VakıfPayS Hosted Payment Page)
- App Store / Google Play aboneliği **yok**
- Mobil uygulama paket ekranından web’e yönlendirir

## Fiyatlar (müşteriye yansıyan toplam)

| Paket | Aylık | Yıllık (12 ay hizmet, **10 ay fiyatı**) | Tasarruf |
|-------|-------|------------------------------------------|----------|
| Temel | **349 TL** | **3.490 TL** | 698 TL |
| Pro | **599 TL** | **5.990 TL** | 1.198 TL |
| Sınırsız | **899 TL** | **8.990 TL** | 1.798 TL |

Kota: Temel 30dk/100 soru · Pro 50dk/300 soru · Sınırsız ∞

## VakıfPayS akış
1. `GET /api/payments/catalog`
2. `POST /api/payments/checkout` → SESSIONTOKEN → `paymentPageUrl`
3. Kullanıcı HPP’de öder
4. `POST /api/payments/vakifpays/callback` → abonelik aktif + e-arşiv kuyruğu

Env: `VAKIFPAYS_MERCHANT_USER`, `VAKIFPAYS_MERCHANT_PASSWORD`, `VAKIFPAYS_MERCHANT_CODE`, `VAKIFPAYS_RETURN_URL`

Test API: `https://testpos.vakifpays.com.tr/vakifpays/api/v2`  
Prod API: `https://pos.vakifpays.com.tr/vakifpays/api/v2`

## E-arşiv (ertelendi — entegratör seçilince)

**Durum:** Henüz e-arşiv sağlayıcısı yok. Ödeme akışı çalışır; fatura kesimi manuel veya sonraki fazda.

- Her başarılı ödemede `invoices` satırı oluşur (`status=pending`) — altyapı hazır
- Logo / Paraşüt / Uyumsoft vb. seçildiğinde: cron job `pending → issued`
- Checkout’ta e-posta + telefon toplanır (fatura için); VKN/TCKN opsiyonel

## Tablolar
`subscriptions`, `payments`, `invoices` — migration `004_vakifpays_billing.sql`
