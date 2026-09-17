# Yayın Checklist — Rotix / Sanal Öğretmen

Yerel MVP çalışıyor. Bu dosya **ilk web yayını** için sırayı verir.
Ödeme / mağaza / WhatsApp bilinçli ertelenmiştir.

---

## 0) Önkoşul (hazır olmalı)

- [x] Supabase proje + migration’lar
- [x] Yerel API `npm run dev` + `/health`
- [x] Flutter Chrome demo
- [ ] Geçerli `GEMINI_API_KEY` (Sokratik + foto + TTS)
- [ ] Supabase Auth’ta e-posta giriş açık; demo dışı gerçek kullanıcı denendi

---

## 1) API’yi internete al (Render — önerilen)

1. https://render.com → GitHub/repo bağla (veya bu klasörü push et).
2. **Blueprint** ile `render.yaml` kullan **veya** Web Service → Docker:
   - Dockerfile: `api_backend/Dockerfile`
   - Context: repo kökü `.`
3. Environment (zorunlu):

| Key | Prod değeri |
|-----|-------------|
| `NODE_ENV` | `production` |
| `SUPABASE_URL` | Project URL |
| `SUPABASE_ANON_KEY` | anon |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role (gizli) |
| `GEMINI_API_KEY` | AI Studio key |
| `PUBLIC_WEB_URL` | Flutter web adresi (adım 2’den sonra) |
| `CORS_ORIGINS` | aynı adres; birden fazlaysa virgülle |
| `ALLOW_HEADER_AUTH` | `false` |
| `BILLING_GATE_ENABLED` | `true` (deneme kilidi) |

4. Deploy → `https://<servis>.onrender.com/health` → `ok`.
5. WebSocket: aynı host üzerinden `wss://...` (ayrı port yok).

**Not:** Free tier uyur; ilk istek yavaş olabilir. Ciddi kullanımda paid plan.

Yerelde Docker denemek:

```bash
docker build -f api_backend/Dockerfile -t rotix-api .
docker run --rm -p 3000:3000 --env-file api_backend/.env -e NODE_ENV=production -e ALLOW_HEADER_AUTH=false rotix-api
```

---

## 2) Flutter web’i yayınla

HTTPS gerekir (kamera/mikrofon + Secure cookies).

Örnek (Firebase Hosting / Cloudflare Pages / Netlify — static `build/web`):

```bash
cd app_frontend
flutter build web --release ^
  --dart-define=API_BASE_URL=https://SENIN-API.onrender.com ^
  --dart-define=SUPABASE_URL=https://SENIN.supabase.co ^
  --dart-define=SUPABASE_ANON_KEY=SENIN_ANON_KEY
```

- `USER_ID` **verme** (prod’da header auth kapalı).
- Çıktı: `app_frontend/build/web` → static host’a yükle.
- Host URL’ini API’deki `PUBLIC_WEB_URL` + `CORS_ORIGINS` yapıp API’yi **redeploy** et.

---

## 3) Supabase Auth (prod)

- [ ] Site URL = Flutter web URL
- [ ] Redirect URLs’e web origin ekle
- [ ] Uygulamada giriş → `POST /api/auth/bootstrap` profil oluşsun
- [ ] Demo `X-User-Id` ile istek **401** dönmeli

---

## 4) Duman testi (yayın sonrası)

- [ ] `/health` ok
- [ ] Kayıt / giriş
- [ ] Soru Sor (metin) → Sokratik cevap
- [ ] Fotoğrafla sor (HTTPS + kamera izni)
- [ ] Veli paneli (varsa)
- [ ] Kota / deneme gate (7 gün sonrası kilit)

---

## 5) Bilerek sonra

| Madde | Ne lazım |
|-------|----------|
| VakıfPayS | Merchant hesap + `VAKIFPAYS_*` + return URL |
| E-arşiv | Entegratör |
| WhatsApp/SMS veli | API token + `PARENT_REPORT_CRON=true` |
| Play / App Store | Ayrı store listing + signing |

---

## Güvenlik özeti (prod kod varsayılanları)

- `NODE_ENV=production` iken `ALLOW_HEADER_AUTH` varsayılan **kapalı**
- `BILLING_GATE_ENABLED` varsayılan **açık**
- CORS: sadece `PUBLIC_WEB_URL` + `CORS_ORIGINS`
- `.env` asla git’e commit edilmez

Takılınca: hangi adım (1–4) + hata metni.
