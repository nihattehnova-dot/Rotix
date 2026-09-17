# Sanal Öğretmen — MVP

**Marka: Rotix** · Maskot: **Roti** (yerel tepkiler, API maliyeti yok)

Tek Flutter (iOS · Android · Web) + Express + Supabase.  
**Ödeme / e-arşiv / WhatsApp anahtarları ertelendi; ürün akışı tamam.**

## Ne çalışır?

| Özellik | Not |
|---------|-----|
| Landing → onboarding → app shell | Web + mobil |
| Akşam tekrarı / beyaz tahta | Canvas + WS senkron |
| Önbellek anlatım | Curriculum JSON → tahta (Gemini yok) |
| Mikro test | Anlatım sonrası / home kısayolu |
| Sokratik Gemini | Kota düşer |
| Hata defteri + günlük plan + mastery | |
| Veli paneli | `role=parent` |
| Auth | Supabase JWT veya demo `X-User-Id` |
| Paketler ekranı | UI hazır; POS merchant yok |

## Kurulum

```bash
# 1) Supabase: migrations 001–004 + seed 005–006

# 2) API
cd api_backend
cp .env.example .env
# SUPABASE_* ve isteğe GEMINI_API_KEY
npm install
npm run dev

# 3) App
cd app_frontend
flutter create . --project-name sanal_ogretmen   # bir kez
flutter pub get
flutter run -d chrome \
  --dart-define=API_BASE_URL=http://localhost:3000 \
  --dart-define=USER_ID=00000000-0000-0000-0000-000000000001
```

Geliştirmede `BILLING_GATE_ENABLED=false` (varsayılan).

## Dokümanlar

- `docs/ARCHITECTURE_DECISIONS.md`
- `docs/COMPETITIVE_GAPS.md`
- `docs/BILLING.md` (ertelendi)
- `docs/ROADMAP.md`

## Sonra (siz hazır olunca)

1. VakıfPayS merchant `.env`
2. E-arşiv sağlayıcı
3. WhatsApp/SMS → `PARENT_REPORT_CRON=true`
