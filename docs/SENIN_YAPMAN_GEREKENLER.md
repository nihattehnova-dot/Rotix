# Senin Yapman Gerekenler (ödeme / fatura YOK)

Her maddeyi bitirince buradan sil veya `[x]` yap.  
Sırayı bozma — yukarıdan aşağı git.

---

## A) Bilgisayara program kur

- [ ] **A1.** Node.js kur (LTS / 20+): https://nodejs.org — kurulumda “Add to PATH” işaretli olsun
- [ ] **A2.** Flutter kur: https://docs.flutter.dev/get-started/install/windows
- [ ] **A3.** Bilgisayarı yeniden başlat (veya tüm terminalleri kapat-aç)
- [ ] **A4.** PowerShell’de şunları yaz, ikisi de sürüm numarası göstersin:
  - `node -v`
  - `flutter --version`
- [ ] **A5.** (İsteğe bağlı ama kolay) Google Chrome kurulu olsun — web’de denemek için

---

## B) Supabase (ücretsiz veritabanı) aç

- [x] **B1.** https://supabase.com adresinden ücretsiz hesap aç
- [x] **B2.** “New project” ile yeni proje oluştur (şifreyi not et) — proje: **rotix**
- [x] **B3.** Sol menüden **Project Settings → API** sayfasına gir; şunları bir yere kopyala:
  - Project URL
  - `anon` `public` key
  - `service_role` key (gizli tut; kimseyle paylaşma) — Notepad: `rotix.txt` ✓
- [x] **B4.** Sol menü **SQL Editor → New query**
- [x] **B5.** Sırayla bu dosyaların içeriğini yapıştırıp **Run** et (her seferinde bir dosya):
  1. `supabase/migrations/001_initial_schema.sql` ✓
  2. `supabase/migrations/002_usage_quotas_daily.sql` ✓
  3. `supabase/migrations/003_trial_and_competitive_features.sql` ✓
  4. `supabase/migrations/004_vakifpays_billing.sql` ✓
  5. `supabase/seed/005_seed_curriculum.sql` ✓
  6. `supabase/seed/006_demo_users.sql` ✓
  7. `supabase/seed/007_curriculum_scripts_and_topics.sql` ← opsiyonel (eski anlatım demo)
  8. `supabase/seed/008_meb_aligned_topics.sql` ← opsiyonel demo konular
- [x] **B6.** Hata çıkarsa ekran görüntüsü / hata metnini kaydet; bana yaz — sorun çıkmadı ✓

> Vizyon: `docs/URUN_VIZYONU.md` · Müfredat: `docs/MUFREDAT_VE_SES.md` · **Yayın:** `docs/YAYIN.md`

---

## C) Backend’i (API) çalıştır

- [x] **C1.** PowerShell aç, şu klasöre gir: (ben hazırladım / Node v24 var)
- [x] **C2.** `.env` dosyasını oluştur: ✓ oluşturuldu
- [x] **C3.** `.env` dosyasını Notepad / Cursor ile aç; `rotix.txt`’teki 3 satırı yaz: ✓
  - `SUPABASE_URL=...` (B3’teki Project URL)
  - `SUPABASE_ANON_KEY=...`
  - `SUPABASE_SERVICE_ROLE_KEY=...`
  - `BILLING_GATE_ENABLED=false` (olduğu gibi kalsın)
  - `ALLOW_HEADER_AUTH=true` (olduğu gibi kalsın)
- [x] **C4.** (İsteğe bağlı) Gemini — şimdilik atlandı (sonra eklenebilir)
- [x] **C5.** Bağımlılıkları kur: ✓ `npm install`
- [x] **C6.** API’yi başlat: ✓ `npm run dev` — çalışıyor
- [x] **C7.** Tarayıcıda aç: http://localhost:3000/health → ok ✓
  → Bu pencereyi **kapatma** (API çalışır kalsın)

---

## D) Uygulamayı (Flutter) çalıştır

- [x] **D1.** app_frontend klasörü ✓
- [x] **D2.** Platform klasörlerini bir kez oluştur: ✓ `flutter create`
- [x] **D3.** Paketleri indir: ✓
- [x] **D4.** Uygulamayı Chrome’da aç: ✓ çalışıyor
- [ ] **D5.** Tarayıcıda uygulama açılınca:
  1. **Uygulamaya gir**
  2. **Soru Sor** (canlı tahta)
  3. **Ödev Desteği** — fotoğraf veya metin
  4. **Unutma Defteri** — tekrar çipleri (varsa)
  5. Gemini key varsa sesli ipucu dene

---

## Yayın (web)

- [ ] **Y1.** `docs/YAYIN.md` adım 1 — API’yi Render’a Docker ile deploy
- [ ] **Y2.** Flutter web release build + static host (HTTPS)
- [ ] **Y3.** `PUBLIC_WEB_URL` / `CORS_ORIGINS` güncelle, header auth kapalı
- [ ] **Y4.** Duman testi (giriş, soru, foto)

---

## E) Şimdilik YAPMA (bilerek ertelendi)

Bunlar olmadan da sistem denenebilir:

- VakıfPayS / ödeme
- E-arşiv fatura
- WhatsApp / SMS veli mesajı
- App Store / Play Store yayınlama

---

## Takılırsan

Hangi madde numarasındasın (ör. **A4**, **B5**, **C7**) ve ekrandaki hata yazısını gönder.  
O maddeden devam ederiz; bitenleri listeden sileriz.
