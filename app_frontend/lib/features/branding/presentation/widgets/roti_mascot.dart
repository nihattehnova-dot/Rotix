import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:sanal_ogretmen/core/branding/roti_mood.dart';
import 'package:sanal_ogretmen/core/theme/app_theme.dart';

/// Şeffaf maskot — kutu/çerçeve yok; ekrana gömülü.
class RotiMascot extends StatefulWidget {
  const RotiMascot({
    super.key,
    required this.mood,
    this.size = 96,
    this.showBubble = false,
    this.customMessage,
    this.floating = false,
  });

  final RotiMood mood;
  final double size;
  final bool showBubble;
  final String? customMessage;
  final bool floating;

  @override
  State<RotiMascot> createState() => _RotiMascotState();
}

class _RotiMascotState extends State<RotiMascot>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1100),
    )..repeat(reverse: true);
  }

  @override
  void didUpdateWidget(covariant RotiMascot oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.mood != widget.mood) {
      _controller
        ..duration = Duration(
          milliseconds: widget.mood == RotiMood.celebrate ? 450 : 1100,
        )
        ..forward(from: 0)
        ..repeat(reverse: true);
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final msg = widget.customMessage ?? widget.mood.bubble;

    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        if (widget.showBubble)
          Container(
            constraints: BoxConstraints(maxWidth: widget.size * 2.4),
            margin: const EdgeInsets.only(bottom: 6),
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            decoration: BoxDecoration(
              color: Colors.white.withOpacity(0.92),
              borderRadius: BorderRadius.circular(16),
              boxShadow: [
                BoxShadow(
                  color: RotixColors.cyan.withOpacity(0.25),
                  blurRadius: 12,
                ),
              ],
            ),
            child: Text(
              msg,
              textAlign: TextAlign.center,
              style: GoogleFonts.nunito(
                fontSize: 13,
                fontWeight: FontWeight.w700,
                color: RotixColors.navy,
              ),
            ),
          ),
        AnimatedBuilder(
          animation: _controller,
          builder: (context, child) {
            final t = _controller.value;
            final bob = (t - 0.5) * (widget.floating ? 10 : 12);
            final scale = widget.mood.bounceScale + (t * 0.04);
            final sway = math.sin(t * math.pi * 2) * 3;

            return Transform.translate(
              offset: Offset(sway, bob),
              child: Transform.scale(scale: scale, child: child),
            );
          },
          child: Image.asset(
            'assets/branding/roti_mascot.png',
            width: widget.size,
            height: widget.size,
            fit: BoxFit.contain,
            filterQuality: FilterQuality.high,
            errorBuilder: (_, __, ___) => Icon(
              Icons.face_retouching_natural_rounded,
              size: widget.size * 0.75,
              color: RotixColors.cyanBright,
            ),
          ),
        ),
      ],
    );
  }
}
