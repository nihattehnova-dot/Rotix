import 'dart:async';
import 'dart:js_interop';

import 'package:web/web.dart' as web;

web.MediaStream? _heldStream;

/// İzin yoksa tarayıcı diyaloğu açılır; stream hemen bırakılır (STT ile çakışmasın).
Future<MicPrimeResult> primeMicrophone() async {
  try {
    releaseMicrophone();
    final stream = await web.window.navigator.mediaDevices
        .getUserMedia(
          web.MediaStreamConstraints(
            audio: true.toJS as JSAny,
            video: false.toJS as JSAny,
          ),
        )
        .toDart;
    // Track’leri hemen kapat — tutmak SpeechRecognition’ı bozar
    final tracks = stream.getTracks().toDart;
    for (final t in tracks) {
      t.stop();
    }
    await Future<void>.delayed(const Duration(milliseconds: 250));
    return const MicPrimeResult(ok: true);
  } catch (e) {
    releaseMicrophone();
    final raw = e.toString().toLowerCase();
    String code = 'unknown';
    String message =
        'Mikrofon açılamadı. Windows Ayarlar → Gizlilik → Mikrofon yolunu kontrol et.';
    if (raw.contains('notallowed') || raw.contains('permission')) {
      code = 'not-allowed';
      message =
          'Tarayıcı mikrofon izni kapalı. Adres çubuğu kilit → Mikrofon → İzin ver, F5.';
    } else if (raw.contains('notfound') || raw.contains('devicesnotfound')) {
      code = 'not-found';
      message =
          'Sistemde mikrofon görünmüyor. Windows’ta mikrofonun bağlı ve açık olduğundan emin ol.';
    } else if (raw.contains('notreadable') ||
        raw.contains('trackstart') ||
        raw.contains('abort')) {
      code = 'busy';
      message =
          'Mikrofon kilitli. Diğer localhost sekmelerini ve Edge’i kapat, bu sekmeyi F5 ile yenile.';
    }
    return MicPrimeResult(ok: false, errorCode: code, message: message);
  }
}

void releaseMicrophone() {
  final stream = _heldStream;
  _heldStream = null;
  if (stream == null) return;
  final tracks = stream.getTracks().toDart;
  for (final track in tracks) {
    track.stop();
  }
}

class MicPrimeResult {
  const MicPrimeResult({
    required this.ok,
    this.errorCode,
    this.message,
  });

  final bool ok;
  final String? errorCode;
  final String? message;
}
