import 'dart:async';
import 'dart:convert';
import 'dart:js_interop';
import 'dart:typed_data';

import 'package:web/web.dart' as web;

/// Web — PCM/WAV chunk’ları biriktirmeden sırayla çalar (TTFT).
class StreamingPcmPlayer {
  StreamingPcmPlayer();

  web.HTMLAudioElement? _audio;
  final List<_QueuedClip> _queue = [];
  bool _playing = false;
  void Function(double level)? onLevel;
  void Function()? onDone;
  bool _streamDone = false;

  Future<void> ensureStarted() async {}

  Future<void> stop() async {
    _queue.clear();
    _playing = false;
    _streamDone = false;
    final a = _audio;
    _audio = null;
    if (a != null) {
      a.pause();
      final src = a.src;
      a.src = '';
      if (src.startsWith('blob:')) {
        web.URL.revokeObjectURL(src);
      }
    }
    onLevel?.call(0);
  }

  Future<void> enqueueBase64(String b64, String mime) async {
    if (b64.isEmpty) return;
    final bytes = base64Decode(b64);
    Uint8List playable;
    String playMime;
    if (mime.contains('wav') || mime.contains('mpeg') || mime.contains('mp3')) {
      playable = Uint8List.fromList(bytes);
      playMime = mime.contains('mpeg') || mime.contains('mp3')
          ? 'audio/mpeg'
          : 'audio/wav';
    } else {
      final rateMatch = RegExp(r'rate=(\d+)').firstMatch(mime);
      final sampleRate =
          rateMatch != null ? int.parse(rateMatch.group(1)!) : 24000;
      playable = _pcmToWav(Uint8List.fromList(bytes), sampleRate);
      playMime = 'audio/wav';
    }
    _queue.add(_QueuedClip(playable, playMime));
    unawaited(_pump());
  }

  void markStreamDone() {
    _streamDone = true;
    if (!_playing && _queue.isEmpty) {
      onLevel?.call(0);
      onDone?.call();
    }
  }

  Future<void> _pump() async {
    if (_playing) return;
    _playing = true;
    while (_queue.isNotEmpty) {
      final clip = _queue.removeAt(0);
      onLevel?.call(0.7);
      await _playBytes(clip.bytes, clip.mime);
    }
    _playing = false;
    if (_streamDone) {
      onLevel?.call(0);
      onDone?.call();
    } else {
      onLevel?.call(0.35);
    }
  }

  Future<void> _playBytes(Uint8List bytes, String mime) async {
    final completer = Completer<void>();
    final blob = web.Blob(
      [bytes.toJS].toJS,
      web.BlobPropertyBag(type: mime),
    );
    final url = web.URL.createObjectURL(blob);
    final audio = web.HTMLAudioElement()
      ..src = url
      ..autoplay = true;
    _audio = audio;
    audio.onEnded.listen((_) {
      web.URL.revokeObjectURL(url);
      if (!completer.isCompleted) completer.complete();
    });
    audio.onError.listen((_) {
      web.URL.revokeObjectURL(url);
      if (!completer.isCompleted) completer.complete();
    });
    try {
      await audio.play().toDart;
    } catch (_) {
      web.URL.revokeObjectURL(url);
      if (!completer.isCompleted) completer.complete();
    }
    await completer.future.timeout(
      const Duration(seconds: 90),
      onTimeout: () {},
    );
  }

  static Uint8List _pcmToWav(Uint8List pcm, int sampleRate) {
    final dataSize = pcm.length;
    final header = ByteData(44);
    header.setUint32(0, 0x46464952, Endian.little); // RIFF
    header.setUint32(4, 36 + dataSize, Endian.little);
    header.setUint32(8, 0x45564157, Endian.little); // WAVE
    header.setUint32(12, 0x20746d66, Endian.little); // fmt
    header.setUint32(16, 16, Endian.little);
    header.setUint16(20, 1, Endian.little);
    header.setUint16(22, 1, Endian.little);
    header.setUint32(24, sampleRate, Endian.little);
    header.setUint32(28, sampleRate * 2, Endian.little);
    header.setUint16(32, 2, Endian.little);
    header.setUint16(34, 16, Endian.little);
    header.setUint32(36, 0x61746164, Endian.little); // data
    header.setUint32(40, dataSize, Endian.little);
    final out = Uint8List(44 + dataSize);
    out.setAll(0, header.buffer.asUint8List());
    out.setAll(44, pcm);
    return out;
  }
}

class _QueuedClip {
  _QueuedClip(this.bytes, this.mime);
  final Uint8List bytes;
  final String mime;
}
