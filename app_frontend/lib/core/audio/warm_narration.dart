import 'dart:convert';

import 'package:flutter_tts/flutter_tts.dart';
import 'package:http/http.dart' as http;
import 'package:just_audio/just_audio.dart';
import 'package:sanal_ogretmen/core/network/api_config.dart';

/// Gemini TTS (abla tonu). Başarısızsa yedek TTS + lastError.
class WarmNarration {
  WarmNarration._();
  static final WarmNarration instance = WarmNarration._();

  final FlutterTts _tts = FlutterTts();
  final AudioPlayer _player = AudioPlayer();
  bool _ttsReady = false;
  String? lastError;
  bool usedGemini = false;
  void Function(double level)? onLevel;
  void Function()? onDone;
  void Function(String message)? onStatus;

  Future<void> _ensureTts() async {
    if (_ttsReady) return;
    await _tts.setLanguage('tr-TR');
    await _tts.setSpeechRate(0.42);
    await _tts.setPitch(1.12);
    await _tts.setVolume(1);
    _tts.setCompletionHandler(() {
      onLevel?.call(0);
      onDone?.call();
    });
    _ttsReady = true;
  }

  Future<void> stop() async {
    await _tts.stop();
    await _player.stop();
    onLevel?.call(0);
  }

  Future<void> speakText(String text, {ApiConfig? config}) async {
    final cleaned = text.trim();
    if (cleaned.isEmpty) return;
    await stop();
    lastError = null;
    usedGemini = false;

    if (config != null) {
      try {
        onStatus?.call('Roti konuşuyor (AI ses)…');
        final res = await http.post(
          Uri.parse('${config.baseUrl}/api/ai/speak'),
          headers: {
            'Content-Type': 'application/json',
            if (config.userId.isNotEmpty) 'X-User-Id': config.userId,
            if (config.accessToken != null)
              'Authorization': 'Bearer ${config.accessToken}',
          },
          body: jsonEncode({
            'text': cleaned,
            'voice': 'Callirrhoe',
            'billAs': 'none',
          }),
        );
        if (res.statusCode >= 200 && res.statusCode < 300) {
          final body = jsonDecode(res.body) as Map<String, dynamic>;
          final b64 = body['audioBase64'] as String?;
          final mime = body['mimeType'] as String? ?? 'audio/wav';
          if (b64 != null && b64.isNotEmpty) {
            usedGemini = true;
            await _playBase64(b64, mime);
            return;
          }
          lastError = body['error'] as String? ??
              'AI ses üretilemedi — Gemini API key kontrol et';
        } else {
          lastError = 'AI ses hatası (${res.statusCode}): ${res.body}';
        }
      } catch (e) {
        lastError = 'AI ses bağlantı hatası: $e';
      }
      onStatus?.call(
        'AI ses çalışmadı (key?). Geçici robot ses kullanılıyor. '
        'Google AI Studio’dan geçerli GEMINI_API_KEY koy.',
      );
    }

    await _ensureTts();
    onLevel?.call(0.55);
    await _tts.speak(cleaned);
  }

  Future<void> playGreeting(ApiConfig config, {String name = 'dostum'}) async {
    try {
      final res = await http.get(
        Uri.parse(
          '${config.baseUrl}/api/ai/greeting?name=${Uri.encodeComponent(name)}',
        ),
        headers: {
          if (config.userId.isNotEmpty) 'X-User-Id': config.userId,
        },
      );
      if (res.statusCode >= 200 && res.statusCode < 300) {
        final body = jsonDecode(res.body) as Map<String, dynamic>;
        final text = body['text'] as String? ?? '';
        final b64 = body['audioBase64'] as String?;
        final mime = body['mimeType'] as String?;
        if (b64 != null && mime != null) {
          usedGemini = true;
          await _playBase64(b64, mime);
          return;
        }
        lastError = body['error'] as String?;
        if (text.isNotEmpty) await speakText(text, config: config);
        return;
      }
    } catch (_) {}
    await speakText(
      'Merhaba $name! Ben Roti, senin ablan gibi bir özel ders arkadaşın. '
      'Bugün okulda hangi konuları işlediniz? Mikrofonu açıp sesinle söylemen yeterli.',
      config: config,
    );
  }

  Future<void> _playBase64(String b64, String mime) async {
    final bytes = base64Decode(b64);
    onLevel?.call(0.65);
    await _player.setAudioSource(
      AudioSource.uri(Uri.dataFromBytes(bytes, mimeType: mime)),
    );
    _player.playerStateStream.listen((s) {
      if (s.processingState == ProcessingState.completed) {
        onLevel?.call(0);
        onDone?.call();
      }
    });
    await _player.play();
  }
}
