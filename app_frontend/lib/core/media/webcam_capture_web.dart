import 'dart:async';
import 'dart:convert';
import 'dart:js_interop';
import 'dart:typed_data';
import 'dart:ui_web' as ui_web;

import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:sanal_ogretmen/core/audio/mic_prime.dart';
import 'package:sanal_ogretmen/core/theme/app_theme.dart';
import 'package:web/web.dart' as web;

/// Chrome/web: gerçek webcam önizleme + kare yakalama.
Future<Uint8List?> captureWebcamPhoto(BuildContext context) {
  return showDialog<Uint8List>(
    context: context,
    barrierDismissible: false,
    builder: (ctx) => const _WebcamCaptureDialog(),
  );
}

class _WebcamCaptureDialog extends StatefulWidget {
  const _WebcamCaptureDialog();

  @override
  State<_WebcamCaptureDialog> createState() => _WebcamCaptureDialogState();
}

class _WebcamCaptureDialogState extends State<_WebcamCaptureDialog> {
  String? _viewType;
  web.MediaStream? _stream;
  web.HTMLVideoElement? _video;
  String? _error;
  bool _ready = false;

  @override
  void initState() {
    super.initState();
    unawaited(_openCamera());
  }

  Future<web.MediaStream> _getCameraStream() async {
    Object? lastError;
    for (var attempt = 0; attempt < 3; attempt++) {
      if (attempt > 0) {
        await Future<void>.delayed(Duration(milliseconds: 350 * attempt));
      }
      try {
        return await web.window.navigator.mediaDevices
            .getUserMedia(
              web.MediaStreamConstraints(
                video: true.toJS as JSAny,
                audio: false.toJS as JSAny,
              ),
            )
            .toDart;
      } catch (e) {
        lastError = e;
      }
    }
    throw lastError ?? StateError('Kamera açılamadı');
  }

  Future<void> _openCamera() async {
    // Mikrofon/STT kilidini bırak
    try {
      releaseMicrophone();
    } catch (_) {}
    await Future<void>.delayed(const Duration(milliseconds: 200));

    try {
      final stream = await _getCameraStream();
      if (!mounted) {
        _stopTracks(stream);
        return;
      }
      _stream = stream;

      final video = web.HTMLVideoElement()
        ..autoplay = true
        ..muted = true
        ..controls = false
        ..setAttribute('playsinline', 'true')
        ..setAttribute('autoplay', 'true')
        ..setAttribute('muted', 'true')
        ..style.border = 'none'
        ..style.width = '100%'
        ..style.height = '100%'
        ..style.objectFit = 'cover'
        ..style.backgroundColor = '#000';
      video.srcObject = stream;
      _video = video;

      try {
        await video.play().toDart;
      } catch (_) {}

      for (var i = 0; i < 20 && video.videoWidth == 0; i++) {
        await Future<void>.delayed(const Duration(milliseconds: 100));
        if (!mounted) {
          _stopCamera();
          return;
        }
      }

      final viewType =
          'rotix-webcam-${DateTime.now().microsecondsSinceEpoch}';
      ui_web.platformViewRegistry.registerViewFactory(viewType, (int viewId) {
        return video;
      });

      if (!mounted) {
        _stopCamera();
        return;
      }
      setState(() {
        _viewType = viewType;
        _ready = true;
        _error = null;
      });
    } catch (e) {
      final raw = e.toString().toLowerCase();
      String msg =
          'Kamera açılamadı. Chrome kilit → Kamera iznini kontrol et.';
      if (raw.contains('notallowed') || raw.contains('permission')) {
        msg = 'Kamera izni yok. Adres çubuğu kilit → Kamera → İzin ver.';
      } else if (raw.contains('notfound')) {
        msg = 'Kamera bulunamadı. Başka bir kamera dene.';
      } else if (raw.contains('notreadable') ||
          raw.contains('trackstart') ||
          raw.contains('abort')) {
        msg =
            'Kamera kilitli. Diğer localhost sekmelerini ve Edge’i kapat → Vazgeç → F5 → tekrar Kamera.';
      }
      if (mounted) {
        setState(() {
          _error = msg;
          _ready = false;
          _viewType = null;
        });
      }
    }
  }

  void _stopTracks(web.MediaStream stream) {
    final tracks = stream.getTracks().toDart;
    for (final t in tracks) {
      t.stop();
    }
  }

  void _stopCamera() {
    final stream = _stream;
    _stream = null;
    if (stream != null) _stopTracks(stream);
    final video = _video;
    _video = null;
    if (video != null) {
      video.srcObject = null;
    }
  }

  void _capture() {
    final video = _video;
    final stream = _stream;
    if (video == null) {
      setState(() => _error = 'Önizleme yok. Vazgeçip tekrar Kamera seç.');
      return;
    }
    var w = video.videoWidth;
    var h = video.videoHeight;
    if (w == 0 || h == 0) {
      final track = stream?.getVideoTracks().toDart.firstOrNull;
      final settings = track?.getSettings();
      w = settings?.width ?? 640;
      h = settings?.height ?? 480;
    }
    if (w == 0 || h == 0) {
      setState(
        () => _error = 'Görüntü henüz gelmedi. 1 sn bekle, tekrar Çek.',
      );
      return;
    }

    final canvas = web.HTMLCanvasElement()
      ..width = w
      ..height = h;
    final ctx = canvas.getContext('2d') as web.CanvasRenderingContext2D;
    ctx.drawImage(video, 0, 0);
    final dataUrl = canvas.toDataURL('image/jpeg');
    final parts = dataUrl.split(',');
    if (parts.length < 2) {
      setState(() => _error = 'Kare alınamadı.');
      return;
    }
    final bytes = Uint8List.fromList(base64Decode(parts.last));
    _stopCamera();
    if (mounted) Navigator.pop(context, bytes);
  }

  @override
  void dispose() {
    _stopCamera();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      backgroundColor: const Color(0xFF1E2640),
      title: Text(
        'Kamerayla çek',
        style: GoogleFonts.nunito(
          fontWeight: FontWeight.w800,
          color: RotixColors.textPrimary,
        ),
      ),
      content: SizedBox(
        width: 480,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            AspectRatio(
              aspectRatio: 4 / 3,
              child: ClipRRect(
                borderRadius: BorderRadius.circular(12),
                child: ColoredBox(
                  color: Colors.black,
                  child: _error != null
                      ? Center(
                          child: Padding(
                            padding: const EdgeInsets.all(16),
                            child: Text(
                              _error!,
                              textAlign: TextAlign.center,
                              style: GoogleFonts.nunito(
                                color: RotixColors.textPrimary,
                                fontSize: 14,
                              ),
                            ),
                          ),
                        )
                      : !_ready || _viewType == null
                          ? Center(
                              child: Column(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  const CircularProgressIndicator(
                                    color: RotixColors.neon,
                                  ),
                                  const SizedBox(height: 12),
                                  Text(
                                    'Kamera açılıyor…',
                                    style: GoogleFonts.nunito(
                                      color: RotixColors.textMuted,
                                    ),
                                  ),
                                ],
                              ),
                            )
                          : HtmlElementView(viewType: _viewType!),
                ),
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Görüntüyü görüyorsan Çek’e bas. Görmüyorsan Vazgeç → F5 → tekrar dene.',
              textAlign: TextAlign.center,
              style: GoogleFonts.nunito(
                fontSize: 12,
                color: RotixColors.textMuted,
              ),
            ),
          ],
        ),
      ),
      actions: [
        TextButton(
          onPressed: () {
            _stopCamera();
            Navigator.pop(context);
          },
          child: Text(
            'Vazgeç',
            style: GoogleFonts.nunito(color: RotixColors.textPrimary),
          ),
        ),
        FilledButton.icon(
          style: FilledButton.styleFrom(backgroundColor: RotixColors.neon),
          onPressed: _ready ? _capture : null,
          icon: const Icon(Icons.camera_alt_rounded, color: Colors.black),
          label: Text(
            'Çek',
            style: GoogleFonts.nunito(
              color: Colors.black,
              fontWeight: FontWeight.w800,
            ),
          ),
        ),
      ],
    );
  }
}

extension<T> on List<T> {
  T? get firstOrNull => isEmpty ? null : first;
}
