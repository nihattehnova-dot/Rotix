import 'dart:async';
import 'dart:convert';

import 'package:flutter_tts/flutter_tts.dart';
import 'package:http/http.dart' as http;
import 'package:just_audio/just_audio.dart';
import 'package:sanal_ogretmen/core/network/api_config.dart';
import 'package:sanal_ogretmen/core/realtime/whiteboard_ws_client.dart';

/// Gemini TTS (abla tonu). Tek parça WAV — net anlaşılır ses.
/// WS streaming küçük PCM parçaları takılma/anlaşılmazlık yaptığından
/// varsayılan yol HTTP /api/ai/speak.
class WarmNarration {
  WarmNarration._();
  static final WarmNarration instance = WarmNarration._();

  final FlutterTts _tts = FlutterTts();
  final AudioPlayer _player = AudioPlayer();
  StreamSubscription<PlayerState>? _stateSub;
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
    await _stateSub?.cancel();
    _stateSub = null;
    await _tts.stop();
    await _player.stop();
    onLevel?.call(0);
  }

  /// WS üzerinden tek WAV (backend artık dilimlemiyor).
  Future<bool> speakViaWs({
    required WhiteboardWsClient ws,
    required String sessionId,
    required String text,
  }) async {
    final cleaned = text.trim();
    if (cleaned.isEmpty) return false;
    await stop();
    lastError = null;
    usedGemini = false;

    final done = Completer<bool>();
    var gotChunk = false;

    void handler(Map<String, dynamic> data) {
      final type = data['type'] as String?;
      if (type == 'audio_chunk') {
        final b64 = data['audioBase64'] as String? ?? '';
        final mime = data['mimeType'] as String? ?? 'audio/wav';
        final isDone = data['done'] == true;
        if (b64.isNotEmpty && !gotChunk) {
          gotChunk = true;
          usedGemini = true;
          unawaited(() async {
            try {
              await _playBase64(b64, mime);
              if (!done.isCompleted) done.complete(true);
            } catch (e) {
              lastError = e.toString();
              if (!done.isCompleted) done.complete(false);
            }
          }());
        }
        if (isDone && !gotChunk && !done.isCompleted) {
          done.complete(false);
        }
      } else if (type == 'speak_error') {
        lastError = data['message'] as String?;
        if (!done.isCompleted) done.complete(false);
      } else if (type == 'speak_done' && !gotChunk && !done.isCompleted) {
        done.complete(false);
      }
    }

    final prev = ws.onAudioEvent;
    ws.onAudioEvent = handler;
    onStatus?.call('Roti konuşuyor…');
    ws.send({
      'type': 'speak_stream',
      'sessionId': sessionId,
      'text': cleaned,
      'voice': 'Callirrhoe',
    });

    final ok = await done.future.timeout(
      const Duration(seconds: 90),
      onTimeout: () => gotChunk,
    );
    ws.onAudioEvent = prev;
    return ok;
  }

  Future<void> speakText(
    String text, {
    ApiConfig? config,
    WhiteboardWsClient? ws,
    String? sessionId,
  }) async {
    final cleaned = text.trim();
    if (cleaned.isEmpty) return;
    await stop();
    lastError = null;
    usedGemini = false;

    // 1) HTTP tek WAV — en net / en az takılma
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
    }

    // 2) WS yedek (tek WAV)
    if (ws != null &&
        sessionId != null &&
        ws.isConnected &&
        await speakViaWs(ws: ws, sessionId: sessionId, text: cleaned)) {
      return;
    }

    onStatus?.call(
      'AI ses çalışmadı (key?). Geçici robot ses kullanılıyor.',
    );
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
    await _stateSub?.cancel();
    await _player.setAudioSource(
      AudioSource.uri(Uri.dataFromBytes(bytes, mimeType: mime)),
    );
    _stateSub = _player.playerStateStream.listen((s) {
      if (s.processingState == ProcessingState.completed) {
        onLevel?.call(0);
        onDone?.call();
      }
    });
    await _player.play();
  }
}
