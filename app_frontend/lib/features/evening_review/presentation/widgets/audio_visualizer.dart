import 'dart:math' as math;

import 'package:flutter/material.dart';

/// Fake waveform for MVP — later driven by real TTS / mic VAD levels.
class AudioVisualizer extends StatefulWidget {
  const AudioVisualizer({
    super.key,
    required this.level,
    required this.active,
    required this.accent,
    this.barCount = 24,
  });

  final double level;
  final bool active;
  final Color accent;
  final int barCount;

  @override
  State<AudioVisualizer> createState() => _AudioVisualizerState();
}

class _AudioVisualizerState extends State<AudioVisualizer>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 900),
    )..repeat();
  }

  @override
  void didUpdateWidget(covariant AudioVisualizer oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.active && !_controller.isAnimating) {
      _controller.repeat();
    } else if (!widget.active && _controller.isAnimating) {
      _controller.stop();
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _controller,
      builder: (context, _) {
        return CustomPaint(
          painter: _WavePainter(
            t: _controller.value,
            level: widget.active ? widget.level : 0.08,
            accent: widget.accent,
            barCount: widget.barCount,
            active: widget.active,
          ),
          size: const Size(double.infinity, 56),
        );
      },
    );
  }
}

class _WavePainter extends CustomPainter {
  _WavePainter({
    required this.t,
    required this.level,
    required this.accent,
    required this.barCount,
    required this.active,
  });

  final double t;
  final double level;
  final Color accent;
  final int barCount;
  final bool active;

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = accent.withOpacity(active ? 0.9 : 0.35)
      ..strokeCap = StrokeCap.round
      ..strokeWidth = 3.2;

    final midY = size.height / 2;
    final gap = size.width / (barCount + 1);

    for (var i = 0; i < barCount; i++) {
      final x = gap * (i + 1);
      final wave = math.sin((t * math.pi * 2) + i * 0.45);
      final h = (8 + (level * 28) * (0.45 + 0.55 * wave.abs())).clamp(4.0, 48.0);
      canvas.drawLine(
        Offset(x, midY - h / 2),
        Offset(x, midY + h / 2),
        paint,
      );
    }
  }

  @override
  bool shouldRepaint(covariant _WavePainter oldDelegate) {
    return oldDelegate.t != t ||
        oldDelegate.level != level ||
        oldDelegate.active != active ||
        oldDelegate.accent != accent;
  }
}
