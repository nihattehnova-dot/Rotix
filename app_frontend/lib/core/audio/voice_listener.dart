import 'package:flutter/foundation.dart';
import 'package:sanal_ogretmen/core/audio/mic_prime.dart';
import 'package:speech_to_text/speech_to_text.dart';

/// Tarayıcı / cihaz mikrofonu → Türkçe metin.
class VoiceListener {
  VoiceListener._();
  static final VoiceListener instance = VoiceListener._();

  final SpeechToText _speech = SpeechToText();
  bool _ready = false;
  String? _localeId;
  String? lastError;
  String _lastPartial = '';
  void Function(String text, bool finalResult)? _onResult;
  void Function(String status)? _onStatus;

  bool get isListening => _speech.isListening;
  String? get localeId => _localeId;
  String get lastHeard => _lastPartial;

  Future<bool> ensureReady() async {
    lastError = null;
    if (_ready && _speech.isAvailable) return true;

    _ready = await _speech.initialize(
      onError: (e) {
        lastError = _mapError(e.errorMsg);
        _onStatus?.call(lastError!);
      },
      onStatus: (status) {
        if (kDebugMode) {
          // ignore: avoid_print
          print('[VoiceListener] status=$status');
        }
        if ((status == 'done' || status == 'notListening') &&
            _lastPartial.trim().isNotEmpty) {
          _onResult?.call(_lastPartial.trim(), true);
        }
        _onStatus?.call(status);
      },
    );

    if (!_ready) {
      lastError ??= 'Konuşma tanıma açılamadı. Google Chrome kullan.';
      return false;
    }

    _localeId = await _pickTurkishLocale();
    return true;
  }

  Future<String?> _pickTurkishLocale() async {
    try {
      final locales = await _speech.locales();
      for (final loc in locales) {
        final id = loc.localeId.toLowerCase();
        if (id == 'tr_tr' || id == 'tr-tr' || id.startsWith('tr')) {
          return loc.localeId;
        }
      }
    } catch (_) {}
    return kIsWeb ? 'tr-TR' : 'tr_TR';
  }

  String _mapError(String raw) {
    final s = raw.toLowerCase();
    if (s.contains('not-allowed') || s.contains('permission')) {
      return 'Mikrofon izni yok. Chrome kilit → Mikrofon → İzin ver, F5.';
    }
    if (s.contains('no-speech') || s.contains('no_speech')) {
      return 'Ses algılanamadı. Yakın konuşup bitince mikrofona tekrar bas.';
    }
    if (s.contains('network')) {
      return 'Konuşma tanıma için internet gerekli.';
    }
    if (s.contains('audio-capture') ||
        s.contains('not-found') ||
        s.contains('not-readable') ||
        s.contains('abort')) {
      return 'Mikrofon kilitli. Diğer localhost sekmelerini kapat, F5 yenile.';
    }
    if (s.contains('not-supported') || s.contains('speech_not_supported')) {
      return 'Bu tarayıcı konuşma tanımayı desteklemiyor. Chrome dene.';
    }
    return raw.isEmpty ? 'Mikrofon hatası' : raw;
  }

  Future<void> start({
    required void Function(String text, bool finalResult) onResult,
    void Function(double level)? onSoundLevel,
    void Function(String status)? onStatus,
  }) async {
    // Önceki oturumu temizle
    try {
      await _speech.cancel();
    } catch (_) {}
    releaseMicrophone();
    await Future<void>.delayed(const Duration(milliseconds: 200));

    final ok = await ensureReady();
    if (!ok) {
      onStatus?.call(lastError ?? 'Mikrofon hazır değil');
      return;
    }

    // Web’de getUserMedia ile “prime” YAPMA — Windows’ta SpeechRecognition ile çakışır.
    // İzin, listen() sırasında tarayıcıdan istenir.

    _lastPartial = '';
    lastError = null;
    _onResult = onResult;
    _onStatus = onStatus;

    try {
      await _speech.listen(
        onResult: (r) {
          final text = r.recognizedWords.trim();
          if (text.isNotEmpty) _lastPartial = text;
          onResult(text, r.finalResult);
        },
        onSoundLevelChange: onSoundLevel,
        listenOptions: SpeechListenOptions(
          localeId: _localeId,
          listenMode: ListenMode.dictation,
          partialResults: true,
          cancelOnError: false,
          listenFor: const Duration(seconds: 60),
          pauseFor: const Duration(seconds: 5),
        ),
      );
    } catch (e) {
      lastError = _mapError(e.toString());
      onStatus?.call(lastError!);
      return;
    }

    await Future<void>.delayed(const Duration(milliseconds: 400));
    if (!_speech.isListening && lastError == null) {
      lastError =
          'Dinleme başlamadı. Diğer localhost sekmelerini kapat → F5 → tekrar dene.';
      onStatus?.call(lastError!);
    }
  }

  Future<void> stop() async {
    await _speech.stop();
    releaseMicrophone();
  }

  Future<void> cancel() async {
    _lastPartial = '';
    _onResult = null;
    _onStatus = null;
    await _speech.cancel();
    releaseMicrophone();
  }
}
