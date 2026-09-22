# Prod Flutter web build — api_backend/.env'den SUPABASE_* okur, secret yazdırmaz.
# Kullanım: PowerShell'de bu dosyayı çalıştır.
#   .\scripts\build_web_prod.ps1

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$envPath = Join-Path $root 'api_backend\.env'
$frontend = Join-Path $root 'app_frontend'

if (-not (Test-Path -LiteralPath $envPath)) {
  Write-Error "api_backend\.env yok. SUPABASE_URL ve SUPABASE_ANON_KEY gerekli."
}

$raw = Get-Content -LiteralPath $envPath -Raw
function Read-DotEnv([string]$name) {
  if ($raw -match "(?m)^$([regex]::Escape($name))=(.*)$") {
    return $Matches[1].Trim().Trim('"').Trim("'")
  }
  return $null
}

$supabaseUrl = Read-DotEnv 'SUPABASE_URL'
$anon = Read-DotEnv 'SUPABASE_ANON_KEY'
$apiBase = Read-DotEnv 'API_PUBLIC_URL'
if (-not $apiBase) { $apiBase = 'https://rotix.onrender.com' }

if (-not $supabaseUrl -or -not $anon) {
  Write-Error "api_backend\.env içinde SUPABASE_URL ve SUPABASE_ANON_KEY olmalı."
}

Write-Host "API_BASE_URL=$apiBase"
Write-Host "SUPABASE_URL host=$(([uri]$supabaseUrl).Host)"
Write-Host "Building Flutter web..."

Set-Location -LiteralPath $frontend
flutter build web --release `
  --dart-define="API_BASE_URL=$apiBase" `
  --dart-define="SUPABASE_URL=$supabaseUrl" `
  --dart-define="SUPABASE_ANON_KEY=$anon"

$out = Join-Path $frontend 'build\web'
Write-Host ""
Write-Host "OK: $out"
Write-Host "Netlify (canlı): https://quiet-mandazi-0ea7b4.netlify.app"
Write-Host "Render Environment:"
Write-Host "  PUBLIC_WEB_URL=https://quiet-mandazi-0ea7b4.netlify.app"
Write-Host "  CORS_ORIGINS=https://quiet-mandazi-0ea7b4.netlify.app"
Write-Host "Sonra Render: Manual Deploy → Deploy latest commit"
