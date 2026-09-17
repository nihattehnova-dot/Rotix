# Flutter — Sanal Öğretmen

```bash
flutter create . --project-name sanal_ogretmen
flutter pub get
flutter run -d chrome \
  --dart-define=API_BASE_URL=http://localhost:3000 \
  --dart-define=USER_ID=00000000-0000-0000-0000-000000000001
```

İsteğe bağlı Auth:
`--dart-define=SUPABASE_URL=... --dart-define=SUPABASE_ANON_KEY=...`

## Ekranlar

`/` landing · `/onboarding` · `/login` · `/app` home ·  
`/app/evening` tahta · `/app/plan` · `/app/weak` · `/app/quiz` ·  
`/app/parent` · `/app/plans`
