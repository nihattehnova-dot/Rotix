import 'package:flutter/material.dart';

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

  factory BoardAnnotation.fromCommand(Map<String, dynamic> json) {
    final type = json['type'] as String? ?? 'text';
    final content =
        json['content'] as String? ?? json['latex'] as String? ?? '';
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
    );
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
      _state?.applyCanvasCommands(commands);

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

class _WhiteboardCanvasState extends State<WhiteboardCanvas> {
  final List<WhiteboardStroke> _strokes = [];
  final List<BoardAnnotation> _annotations = [];
  WhiteboardStroke? _current;
  Size _size = Size.zero;

  @override
  void initState() {
    super.initState();
    widget.controller?._attach(this);
    widget.onClearReady?.call(clear);
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
    widget.controller?._detach(this);
    super.dispose();
  }

  void clear({bool fromRemote = false}) {
    setState(() {
      _strokes.clear();
      _annotations.clear();
      _current = null;
    });
  }

  void applyRemoteStroke(Map<String, dynamic> json) {
    setState(() => _strokes.add(WhiteboardStroke.fromJson(json)));
  }

  void applyCanvasCommands(List<Map<String, dynamic>> commands) {
    setState(() {
      for (final cmd in commands) {
        final type = cmd['type'] as String? ?? '';
        if (type == 'clear') {
          _strokes.clear();
          _annotations.clear();
        } else {
          _annotations.add(BoardAnnotation.fromCommand(cmd));
        }
      }
    });
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
  });

  final List<WhiteboardStroke> strokes;
  final List<BoardAnnotation> annotations;
  final Size boardSize;
  final bool showGrid;

  Offset _map(double lx, double ly) {
    final w = boardSize.width <= 0 ? 1.0 : boardSize.width;
    final h = boardSize.height <= 0 ? 1.0 : boardSize.height;
    return Offset(lx / 1000 * w, ly / 1000 * h);
  }

  @override
  void paint(Canvas canvas, Size size) {
    // Sıcak krem öğretmen tahtası — çizgisiz
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

    for (final a in annotations) {
      switch (a.type) {
        case 'line':
          if (a.x1 != null && a.y1 != null && a.x2 != null && a.y2 != null) {
            canvas.drawLine(
              _map(a.x1!, a.y1!),
              _map(a.x2!, a.y2!),
              Paint()
                ..color = const Color(0xFF0B1B3A)
                ..strokeWidth = 3,
            );
          }
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
        case 'text':
        case 'formula':
          if (a.x != null && a.y != null && a.content != null) {
            final tp = TextPainter(
              text: TextSpan(
                text: a.content,
                style: TextStyle(
                  color: const Color(0xFF0B1B3A),
                  fontSize: a.type == 'formula' ? 20 : 17,
                  fontWeight: FontWeight.w700,
                  height: 1.25,
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
