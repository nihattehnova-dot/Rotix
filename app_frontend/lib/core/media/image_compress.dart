import 'dart:typed_data';
import 'dart:ui' as ui;

/// Vision maliyeti için max 1024 kenar, JPEG kalite ~78.
Future<Uint8List> compressQuestionImage(
  Uint8List bytes, {
  int maxEdge = 1024,
  int quality = 78,
}) async {
  try {
    final codec = await ui.instantiateImageCodec(
      bytes,
      targetWidth: maxEdge,
      targetHeight: maxEdge,
    );
    final frame = await codec.getNextFrame();
    final image = frame.image;
    final w = image.width;
    final h = image.height;
    final scale = (maxEdge / (w > h ? w : h)).clamp(0.0, 1.0);
    final tw = (w * scale).round().clamp(1, maxEdge);
    final th = (h * scale).round().clamp(1, maxEdge);

    final recorder = ui.PictureRecorder();
    final canvas = ui.Canvas(recorder);
    canvas.drawImageRect(
      image,
      ui.Rect.fromLTWH(0, 0, w.toDouble(), h.toDouble()),
      ui.Rect.fromLTWH(0, 0, tw.toDouble(), th.toDouble()),
      ui.Paint()..filterQuality = ui.FilterQuality.medium,
    );
    final picture = recorder.endRecording();
    final out = await picture.toImage(tw, th);
    final bd = await out.toByteData(format: ui.ImageByteFormat.png);
    image.dispose();
    out.dispose();
    if (bd == null) return bytes;
    // PNG çıktı — sunucu WebP'ye çevirir; boyut yine küçülür
    return bd.buffer.asUint8List();
  } catch (_) {
    return bytes;
  }
}
