# API Backend

```bash
cp .env.example .env && npm i && npm run dev
```

- HTTP: `:3000`
- WebSocket: `ws://host:3000/ws`
- Auth: `Authorization: Bearer <supabase-jwt>` veya `X-User-Id` (dev)
- Billing gate: `BILLING_GATE_ENABLED=false` (dev)

## Ana rotalar

| Path | Açıklama |
|------|----------|
| `/health` | Durum |
| `/api/auth/bootstrap` | Profil oluştur |
| `/api/auth/me` | Profil |
| `/api/sessions*` | Oturum |
| `/api/mistakes*` | Hata defteri |
| `/api/ai/socratic` | Gemini |
| `/api/learning/*` | Plan, curriculum, quiz, foto, veli |
| `/api/quotas/me` | Kota |
| `/api/payments/*` | Katalog/checkout (POS ertelendi) |
| `/api/reports/parent/run` | Veli raporu manuel |

Detay: kök `README.md` ve `docs/`.
