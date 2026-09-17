import 'dart:ui';

import 'package:flutter/material.dart';
import 'package:sanal_ogretmen/core/theme/app_theme.dart';

/// Ortak arka plan gradyanı: #0A0E21 → #1A1F38
class RotixBackdrop extends StatelessWidget {
  const RotixBackdrop({super.key, required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        gradient: RadialGradient(
          center: Alignment(-0.35, -0.55),
          radius: 1.35,
          colors: [
            Color(0xFF243056),
            RotixColors.bgMid,
            RotixColors.bgDeep,
          ],
          stops: [0.0, 0.45, 1.0],
        ),
      ),
      child: child,
    );
  }
}

/// Buzlu cam kart: #1E2640 @ 60% + blur + %10 beyaz çerçeve
class GlassCard extends StatelessWidget {
  const GlassCard({
    super.key,
    required this.child,
    this.padding,
    this.radius = 22,
    this.onTap,
    this.neonSelected = false,
  });

  final Widget child;
  final EdgeInsetsGeometry? padding;
  final double radius;
  final VoidCallback? onTap;
  final bool neonSelected;

  @override
  Widget build(BuildContext context) {
    final body = Container(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(radius),
        boxShadow: neonSelected ? neonGlow(blur: 20, spread: 0.5) : null,
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(radius),
        child: BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 12, sigmaY: 12),
          child: Container(
            padding: padding ?? const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: RotixColors.glass.withOpacity(0.60),
              borderRadius: BorderRadius.circular(radius),
              border: Border.all(
                color: neonSelected
                    ? RotixColors.neon.withOpacity(0.85)
                    : Colors.white.withOpacity(0.10),
                width: neonSelected ? 2.2 : 1,
              ),
            ),
            child: child,
          ),
        ),
      ),
    );
    if (onTap == null) return body;
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(radius),
        child: body,
      ),
    );
  }
}

class GlassPill extends StatelessWidget {
  const GlassPill({super.key, required this.child, this.onTap});

  final Widget child;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final body = ClipRRect(
      borderRadius: BorderRadius.circular(999),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 10, sigmaY: 10),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
          decoration: BoxDecoration(
            color: RotixColors.glass.withOpacity(0.60),
            borderRadius: BorderRadius.circular(999),
            border: Border.all(color: Colors.white.withOpacity(0.10)),
          ),
          child: child,
        ),
      ),
    );
    if (onTap == null) return body;
    return GestureDetector(onTap: onTap, child: body);
  }
}

List<BoxShadow> neonGlow({double blur = 22, double spread = 0}) => [
      BoxShadow(
        color: RotixColors.neon.withOpacity(0.45),
        blurRadius: blur,
        spreadRadius: spread,
      ),
      BoxShadow(
        color: RotixColors.neonSoft.withOpacity(0.25),
        blurRadius: blur * 1.4,
        spreadRadius: spread,
      ),
    ];
