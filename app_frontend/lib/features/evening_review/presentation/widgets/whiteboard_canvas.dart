import 'dart:async';
import 'dart:convert';
import 'dart:math' as math;
import 'dart:typed_data';
import 'dart:ui' as ui;

import 'package:flutter/material.dart';
import 'package:sanal_ogretmen/core/math/math_normalize.dart';

class StrokePoint {
  const StrokePoint(this.offset, this.pressure);
  final Offset offset;
  final double pressure;
}

class WhiteboardStroke {
  WhiteboardStroke({required this.color, required this.width});
  final Color color;
  final double width;
  final List<StrokePoint> points = [];

  Map<String, dynamic> toJson() => {
        'color': '#${color.value.toRadixString(16).padLeft(8, '0')}',
        'width': width,
        'points': points
            .map((p) => {'x': p.offset.dx, 'y': p.offset.dy})
            .toList(),
      };

  factory WhiteboardStroke.fromJson(Map<String, dynamic> json) {
    final colorStr = json['color'] as String? ?? '#ff0f766e';
    final hex = colorStr.replaceFirst('#', '');
    final color = Color(int.parse(hex.length == 6 ? 'ff$hex' : hex, radix: 16));
    final stroke = WhiteboardStroke(
      color: color,
      width: (json['width'] as num?)?.toDouble() ?? 3.2,
    );
    for (final p in (json['points'] as List<dynamic>? ?? const [])) {
      if (p is Map<String, dynamic>) {
        stroke.points.add(
          StrokePoint(
            Offset(
              (p['x'] as num?)?.toDouble() ?? 0,
              (p['y'] as num?)?.toDouble() ?? 0,
            ),
            1,
          ),
        );
      }
    }
    return stroke;
  }
}

class BoardAnnotation {
  const BoardAnnotation({
    required this.type,
    this.x,
    this.y,
    this.x1,
    this.y1,
    this.x2,
    this.y2,
    this.w,
    this.h,
    this.content,
    this.imageBytes,
    this.shape,
    this.spoiler = false,
    this.labels,
    this.highlightAngle,
  });

  final String type;
  final double? x;
  final double? y;
  final double? x1;
  final double? y1;
  final double? x2;
  final double? y2;
  final double? w;
  final double? h;
  final String? content;
  final Uint8List? imageBytes;
  final String? shape;
  final bool spoiler;
  final Map<String, List<double>>? labels;
  final String? highlightAngle;

  static BoardAnnotation? tryFromCommand(Map<String, dynamic> json) {
    try {
      final type = json['type'] as String? ?? 'text';
      final content =
          json['content'] as String? ?? json['latex'] as String? ?? '';
      Uint8List? imageBytes;
      final dataUrl = json['dataUrl'] as String? ?? json['imageBase64'] as String?;
      if (dataUrl != null && dataUrl.isNotEmpty) {
        final raw = dataUrl.contains(',') ? dataUrl.split(',').last : dataUrl;
        imageBytes = Uint8List.fromList(base64Decode(raw));
      }
      Map<String, List<double>>? labels;
      final labelsRaw = json['labels'];
      if (labelsRaw is Map) {
        labels = {};
        for (final e in labelsRaw.entries) {
          final v = e.value;
          if (v is List && v.length >= 2) {
            labels[e.key.toString()] = [
              (v[0] as num).toDouble(),
              (v[1] as num).toDouble(),
            ];
          }
        }
      }
      return BoardAnnotation(
        type: type,
        x: (json['x'] as num?)?.toDouble(),
        y: (json['y'] as num?)?.toDouble(),
        x1: (json['x1'] as num?)?.toDouble(),
        y1: (json['y1'] as num?)?.toDouble(),
        x2: (json['x2'] as num?)?.toDouble(),
        y2: (json['y2'] as num?)?.toDouble(),
        w: (json['w'] as num?)?.toDouble(),
        h: (json['h'] as num?)?.toDouble(),
        content: content.isEmpty ? null : content,
        imageBytes: imageBytes,
        shape: json['shape'] as String?,
        spoiler: json['spoiler'] == true,
        labels: labels,
        highlightAngle: json['highlightAngle'] as String?,
      );
    } catch (_) {
      return null;
    }
  }
}

class WhiteboardController {
  _WhiteboardCanvasState? _state;

  void _attach(_WhiteboardCanvasState state) => _state = state;
  void _detach(_WhiteboardCanvasState state) {
    if (_state == state) _state = null;
  }

  void clear() => _state?.clear();
  void applyRemoteStroke(Map<String, dynamic> json) =>
      _state?.applyRemoteStroke(json);
  void clearRemote() => _state?.clear(fromRemote: true);
  void applyCanvasCommands(List<Map<String, dynamic>> commands) =>
      _state?.enqueueCanvasCommands(commands);
  void setStudentPhoto(String? dataUrl) => _state?.setStudentPhoto(dataUrl);
  void clearStudentPhoto() => _state?.setStudentPhoto(null);

  WhiteboardStroke? takeLastStroke() => _state?.takeLastStroke();
}

class WhiteboardCanvas extends StatefulWidget {
  const WhiteboardCanvas({
    super.key,
    required this.strokeColor,
    required this.onStrokeComplete,
    this.controller,
    this.onClearReady,
    this.readOnly = false,
    this.showGrid = false,
  });

  final Color strokeColor;
  final VoidCallback onStrokeComplete;
  final WhiteboardController? controller;
  final ValueChanged<VoidCallback>? onClearReady;
  final bool readOnly;
  final bool showGrid;

  @override
  State<WhiteboardCanvas> createState() => _WhiteboardCanvasState();
}

class _WhiteboardCanvasState extends State<WhiteboardCanvas>
    with SingleTickerProviderStateMixin {
  final List<WhiteboardStroke> _strokes = [];
  final List<BoardAnnotation> _annotations = [];
  final List<Map<String, dynamic>> _queue = [];
  WhiteboardStroke? _current;
  Size _size = Size.zero;
  bool _draining = false;
  String? _studentPhotoDataUrl;
  ui.Image? _studentPhotoImage;
  late final AnimationController _tick;

  @override
  void initState() {
    super.initState();
    widget.controller?._attach(this);
    widget.onClearReady?.call(clear);
    _tick = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 16),
    )..addListener(_onFrame);
  }

  @override
  void didUpdateWidget(covariant WhiteboardCanvas oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.controller != widget.controller) {
      oldWidget.controller?._detach(this);
      widget.controller?._attach(this);
    }
  }

  @override
  void dispose() {
    _tick.dispose();
    widget.controller?._detach(this);
    _studentPhotoImage?.dispose();
    super.dispose();
  }

  void _onFrame() {
    if (!_draining) return;
    // requestAnimationFrame proxy — AnimationController tick
  }

  void clear({bool fromRemote = false}) {
    _queue.clear();
    _draining = false;
    setState(() {
      _strokes.clear();
      _annotations.clear();
      _current = null;
    });
  }

  Future<void> setStudentPhoto(String? dataUrl) async {
    _studentPhotoDataUrl = dataUrl;
    _studentPhotoImage?.dispose();
    _studentPhotoImage = null;
    if (dataUrl == null || dataUrl.isEmpty) {
      if (mounted) setState(() {});
      return;
    }
    try {
      final raw = dataUrl.contains(',') ? dataUrl.split(',').last : dataUrl;
      final bytes = Uint8List.fromList(base64Decode(raw));
      final codec = await ui.instantiateImageCodec(bytes);
      final frame = await codec.getNextFrame();
      if (!mounted) {
        frame.image.dispose();
        return;
      }
      setState(() => _studentPhotoImage = frame.image);
    } catch (_) {
      if (mounted) setState(() => _studentPhotoImage = null);
    }
  }

  void applyRemoteStroke(Map<String, dynamic> json) {
    setState(() => _strokes.add(WhiteboardStroke.fromJson(json)));
  }

  /// Tool-call komutlarını kuyruğa al; delayMs + rAF ile adım adım bas.
  void enqueueCanvasCommands(List<Map<String, dynamic>> commands) {
    try {
      for (final cmd in commands) {
        _queue.add(Map<String, dynamic>.from(cmd));
      }
      unawaited(_drainQueue());
    } catch (e) {
      debugPrint('[whiteboard] enqueue parse error: $e');
    }
  }

  Future<void> _drainQueue() async {
    if (_draining) return;
    _draining = true;
    if (!_tick.isAnimating) _tick.repeat();
    while (_queue.isNotEmpty && mounted) {
      final cmd = _queue.removeAt(0);
      try {
        final delayMs = (cmd['delayMs'] as num?)?.toInt() ?? 100;
        if (delayMs > 0) {
          await Future<void>.delayed(Duration(milliseconds: delayMs.clamp(0, 400)));
        }
        if (!mounted) break;
        _applyOne(cmd);
      } catch (e) {
        debugPrint('[whiteboard] command apply error: $e');
      }
      // Yield to next animation frame
      await Future<void>.delayed(Duration.zero);
    }
    _draining = false;
    _tick.stop();
  }

  void _applyOne(Map<String, dynamic> cmd) {
    final type = cmd['type'] as String? ?? '';
    if (type == 'clear') {
      setState(() {
        _strokes.clear();
        _annotations.clear();
      });
      return;
    }
    final ann = BoardAnnotation.tryFromCommand(cmd);
    if (ann == null) return;
    setState(() => _annotations.add(ann));
  }

  WhiteboardStroke? takeLastStroke() =>
      _strokes.isEmpty ? null : _strokes.last;

  void _start(Offset pos) {
    if (widget.readOnly) return;
    _current = WhiteboardStroke(color: widget.strokeColor, width: 3.6)
      ..points.add(StrokePoint(pos, 1));
    setState(() {});
  }

  void _update(Offset pos) {
    if (widget.readOnly || _current == null) return;
    _current!.points.add(StrokePoint(pos, 1));
    setState(() {});
  }

  void _end() {
    if (widget.readOnly) return;
    if (_current != null && _current!.points.length > 1) {
      _strokes.add(_current!);
      widget.onStrokeComplete();
    }
    _current = null;
    setState(() {});
  }

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        _size = Size(constraints.maxWidth, constraints.maxHeight);
        return ClipRRect(
          borderRadius: BorderRadius.circular(22),
          child: GestureDetector(
            onPanStart: (d) => _start(d.localPosition),
            onPanUpdate: (d) => _update(d.localPosition),
            onPanEnd: (_) => _end(),
            child: CustomPaint(
              painter: _BoardPainter(
                strokes: [
                  ..._strokes,
                  if (_current != null) _current!,
                ],
                annotations: _annotations,
                boardSize: _size,
                showGrid: widget.showGrid,
                studentPhoto: _studentPhotoImage,
              ),
              child: const SizedBox.expand(),
            ),
          ),
        );
      },
    );
  }
}

class _BoardPainter extends CustomPainter {
  _BoardPainter({
    required this.strokes,
    required this.annotations,
    required this.boardSize,
    required this.showGrid,
    this.studentPhoto,
  });

  final List<WhiteboardStroke> strokes;
  final List<BoardAnnotation> annotations;
  final Size boardSize;
  final bool showGrid;
  final ui.Image? studentPhoto;

  Offset _map(double lx, double ly) {
    final w = boardSize.width <= 0 ? 1.0 : boardSize.width;
    final h = boardSize.height <= 0 ? 1.0 : boardSize.height;
    return Offset(lx / 1000 * w, ly / 1000 * h);
  }

  void _paintShape(Canvas canvas, BoardAnnotation a) {
    if (a.x == null || a.y == null) return;
    final origin = _map(a.x!, a.y!);
    final ww = ((a.w ?? 180) / 1000) * boardSize.width;
    final hh = ((a.h ?? 180) / 1000) * boardSize.height;
    final paint = Paint()
      ..color = const Color(0xFF0B1B3A)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2.5;
    final kind = a.shape ?? 'circle';
    if (kind == 'coords') {
      canvas.drawLine(
        Offset(origin.dx, origin.dy + hh),
        Offset(origin.dx + ww, origin.dy + hh),
        paint,
      );
      canvas.drawLine(
        Offset(origin.dx, origin.dy + hh),
        Offset(origin.dx, origin.dy),
        paint,
      );
      return;
    }
    if (kind == 'triangle') {
      final path = Path()
        ..moveTo(origin.dx + ww / 2, origin.dy)
        ..lineTo(origin.dx + ww, origin.dy + hh)
        ..lineTo(origin.dx, origin.dy + hh)
        ..close();
      canvas.drawPath(path, paint);
      return;
    }
    canvas.drawOval(Rect.fromLTWH(origin.dx, origin.dy, ww, hh), paint);
  }

  void _paintDrawGeometry(Canvas canvas, BoardAnnotation a) {
    final paint = Paint()
      ..color = const Color(0xFF0B1B3A)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2.8
      ..strokeJoin = StrokeJoin.round;
    final labels = a.labels;
    if (labels != null &&
        labels.length >= 3 &&
        (a.shape == null || a.shape == 'triangle')) {
      final pts = labels.values.map((v) => _map(v[0], v[1])).toList();
      final path = Path()
        ..moveTo(pts[0].dx, pts[0].dy)
        ..lineTo(pts[1].dx, pts[1].dy)
        ..lineTo(pts[2].dx, pts[2].dy)
        ..close();
      canvas.drawPath(path, paint);
      for (final e in labels.entries) {
        final p = _map(e.value[0], e.value[1]);
        final tp = TextPainter(
          text: TextSpan(
            text: e.key,
            style: const TextStyle(
              color: Color(0xFF0B1B3A),
              fontSize: 16,
              fontWeight: FontWeight.w800,
            ),
          ),
          textDirection: TextDirection.ltr,
        )..layout();
        tp.paint(canvas, Offset(p.dx - 6, p.dy - 22));
      }
      final hi = a.highlightAngle;
      if (hi != null && labels.containsKey(hi)) {
        final p = _map(labels[hi]![0], labels[hi]![1]);
        canvas.drawCircle(
          p,
          18,
          Paint()
            ..color = const Color(0x66FBBF24)
            ..style = PaintingStyle.fill,
        );
      }
      return;
    }
    _paintShape(
      canvas,
      BoardAnnotation(
        type: 'shape',
        shape: a.shape ?? 'triangle',
        x: 250,
        y: 120,
        w: 320,
        h: 280,
      ),
    );
  }

  @override
  void paint(Canvas canvas, Size size) {
    final bg = Paint()
      ..shader = const LinearGradient(
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
        colors: [Color(0xFFFFF8EF), Color(0xFFF3E7D3)],
      ).createShader(Offset.zero & size);
    canvas.drawRect(Offset.zero & size, bg);

    if (showGrid) {
      final grid = Paint()
        ..color = const Color(0x33A78B6B)
        ..strokeWidth = 1;
      const step = 32.0;
      for (double x = 0; x < size.width; x += step) {
        canvas.drawLine(Offset(x, 0), Offset(x, size.height), grid);
      }
      for (double y = 0; y < size.height; y += step) {
        canvas.drawLine(Offset(0, y), Offset(size.width, y), grid);
      }
    }

    // Öğrenci sorusu fotoğrafı — sağ üst köşe
    final photo = studentPhoto;
    if (photo != null) {
      final maxW = size.width * 0.28;
      final maxH = size.height * 0.28;
      final scale = (maxW / photo.width).clamp(0.0, maxH / photo.height);
      final dw = photo.width * scale;
      final dh = photo.height * scale;
      final dst = Rect.fromLTWH(size.width - dw - 12, 12, dw, dh);
      canvas.drawRRect(
        RRect.fromRectAndRadius(dst.inflate(4), const Radius.circular(8)),
        Paint()..color = const Color(0xE6FFFFFF),
      );
      paintImage(
        canvas: canvas,
        rect: dst,
        image: photo,
        fit: BoxFit.cover,
        filterQuality: FilterQuality.medium,
      );
      final label = TextPainter(
        text: const TextSpan(
          text: 'Öğrencinin Sorusu',
          style: TextStyle(
            color: Color(0xFF0B1B3A),
            fontSize: 11,
            fontWeight: FontWeight.w800,
          ),
        ),
        textDirection: TextDirection.ltr,
      )..layout();
      label.paint(canvas, Offset(dst.left, dst.bottom + 4));
    }

    for (final a in annotations) {
      switch (a.type) {
        case 'line':
        case 'arrow':
          if (a.x1 != null && a.y1 != null && a.x2 != null && a.y2 != null) {
            final p1 = _map(a.x1!, a.y1!);
            final p2 = _map(a.x2!, a.y2!);
            canvas.drawLine(
              p1,
              p2,
              Paint()
                ..color = const Color(0xFF0B1B3A)
                ..strokeWidth = a.type == 'arrow' ? 3.5 : 3
                ..strokeCap = StrokeCap.round,
            );
            if (a.type == 'arrow') {
              final angle = (p2 - p1).direction;
              const head = 14.0;
              final a1 = Offset(
                p2.dx - head * math.cos(angle - 0.4),
                p2.dy - head * math.sin(angle - 0.4),
              );
              final a2 = Offset(
                p2.dx - head * math.cos(angle + 0.4),
                p2.dy - head * math.sin(angle + 0.4),
              );
              canvas.drawLine(p2, a1, Paint()
                ..color = const Color(0xFF0B1B3A)
                ..strokeWidth = 3);
              canvas.drawLine(p2, a2, Paint()
                ..color = const Color(0xFF0B1B3A)
                ..strokeWidth = 3);
            }
          }
          break;
        case 'shape':
          _paintShape(canvas, a);
          break;
        case 'draw_geometry':
          _paintDrawGeometry(canvas, a);
          break;
        case 'rect':
        case 'highlight':
          if (a.x != null && a.y != null && a.w != null && a.h != null) {
            final p1 = _map(a.x!, a.y!);
            final p2 = _map(a.x! + a.w!, a.y! + a.h!);
            canvas.drawRRect(
              RRect.fromRectAndRadius(
                Rect.fromPoints(p1, p2),
                const Radius.circular(8),
              ),
              Paint()
                ..color = a.type == 'highlight'
                    ? const Color(0x66FBBF24)
                    : const Color(0x3322D3EE)
                ..style = PaintingStyle.fill,
            );
          }
          break;
        case 'image':
          if (a.imageBytes != null && a.x != null && a.y != null) {
            // Async decode handled via setStudentPhoto; skip inline for perf
          }
          break;
        case 'text':
        case 'formula':
          if (a.x != null && a.y != null && a.content != null) {
            final display = a.spoiler
                ? '•••'
                : normalizeMathText(a.content!);
            final tp = TextPainter(
              text: TextSpan(
                text: display,
                style: TextStyle(
                  color: a.spoiler
                      ? const Color(0x660B1B3A)
                      : const Color(0xFF0B1B3A),
                  fontSize: a.type == 'formula' ? 20 : 17,
                  fontWeight: FontWeight.w700,
                  height: 1.25,
                  backgroundColor:
                      a.spoiler ? const Color(0x33A78B6B) : null,
                ),
              ),
              textDirection: TextDirection.ltr,
            )..layout(maxWidth: size.width * 0.88);
            tp.paint(canvas, _map(a.x!, a.y!));
          }
          break;
      }
    }

    for (final stroke in strokes) {
      if (stroke.points.length < 2) continue;
      final paint = Paint()
        ..color = stroke.color
        ..strokeWidth = stroke.width
        ..strokeCap = StrokeCap.round
        ..strokeJoin = StrokeJoin.round
        ..style = PaintingStyle.stroke;
      final path = Path()
        ..moveTo(stroke.points.first.offset.dx, stroke.points.first.offset.dy);
      for (var i = 1; i < stroke.points.length; i++) {
        path.lineTo(stroke.points[i].offset.dx, stroke.points[i].offset.dy);
      }
      canvas.drawPath(path, paint);
    }
  }

  @override
  bool shouldRepaint(covariant _BoardPainter oldDelegate) => true;
}
