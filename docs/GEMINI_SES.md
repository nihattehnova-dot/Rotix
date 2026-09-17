# Gemini API key (ses + öğretmen AI)

Sesin robot gibi çıkmasının nedeni: **geçersiz / eksik `GEMINI_API_KEY`**.
Sistem o zaman tarayıcının ucuz TTS’ine düşüyor.

## Ne yap

1. https://aistudio.google.com/apikey → **Create API key**
2. `api_backend/.env` dosyasını Notepad ile aç, şunları yaz:

```
GEMINI_API_KEY=buraya_yeni_anahtar
GEMINI_MODEL=gemini-2.0-flash
GEMINI_TTS_MODEL=gemini-2.5-flash-preview-tts
```

3. API’yi yeniden başlat (`npm run dev` çalışan pencereyi kapat-aç)
4. Uygulamada tekrar **Sesli anlatım** dene — Roti **Callirrhoe** sesiyle abla tonunda konuşmalı

## Mikrofon

Chrome’da site için mikrofon izni ver. **Konuş** butonuna bas → konuş → metin görünür.
