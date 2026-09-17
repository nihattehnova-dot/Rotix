import 'package:flutter_tts/flutter_tts.dart';

/// Tarayıcı / cihaz TTS — ücretsiz, ek API key yok.
/// İleride: ElevenLabs / Google TTS → Supabase Storage URL.
class NarrationTts {
  NarrationTts._();
  static final NarrationTts instance = NarrationTts._();

  final FlutterTts _tts = FlutterTts();
  bool _ready = false;
  void Function(double level)? onLevel;
  void Function()? onDone;

  Future<void> ensureReady() async {
    if (_ready) return;
    await _tts.setLanguage('tr-TR');
    await _tts.setSpeechRate(0.48);
    await _tts.setVolume(1.0);
    await _tts.setPitch(1.05);
    _tts.setCompletionHandler(() {
      onLevel?.call(0);
      onDone?.call();
    });
    _tts.setCancelHandler(() {
      onLevel?.call(0);
      onDone?.call();
    });
    _tts.setErrorHandler((_) {
      onLevel?.call(0);
      onDone?.call();
    });
    _ready = true;
  }

  Future<void> speak(String text) async {
    final cleaned = text.trim();
    if (cleaned.isEmpty) return;
    await ensureReady();
    await stop();
    onLevel?.call(0.6);
    await _tts.speak(cleaned);
  }

  Future<void> stop() async {
    await _tts.stop();
    onLevel?.call(0);
  }
}
