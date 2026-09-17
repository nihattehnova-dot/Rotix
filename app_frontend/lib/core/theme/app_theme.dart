import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

/// Rotix design tokens (ürün paleti).
class RotixColors {
  static const bgDeep = Color(0xFF0A0E21);
  static const bgMid = Color(0xFF1A1F38);
  static const glass = Color(0xFF1E2640);
  static const neon = Color(0xFF00F2FE);
  static const neonSoft = Color(0xFF4FACFE);
  static const textPrimary = Color(0xFFFFFFFF);
  static const textMuted = Color(0xFFA0AEC0);
  static const streak = Color(0xFFFF6B6B);
  static const timeBadge = Color(0xFFFFD166);

  // Legacy aliases used across the app
  static const navy = bgMid;
  static const navyDeep = bgDeep;
  static const royal = neonSoft;
  static const cyan = neon;
  static const cyanBright = neon;
  static const ink = textPrimary;
  static const muted = textMuted;
}

class AppTheme {
  static ThemeData light() {
    final base = ThemeData(
      useMaterial3: true,
      brightness: Brightness.dark,
      colorScheme: const ColorScheme.dark(
        primary: RotixColors.neon,
        secondary: RotixColors.neonSoft,
        surface: RotixColors.bgMid,
        onPrimary: RotixColors.bgDeep,
        onSurface: RotixColors.textPrimary,
      ),
    );

    return base.copyWith(
      scaffoldBackgroundColor: RotixColors.bgDeep,
      textTheme: GoogleFonts.nunitoTextTheme(base.textTheme).apply(
        bodyColor: RotixColors.textPrimary,
        displayColor: RotixColors.textPrimary,
      ),
      appBarTheme: AppBarTheme(
        elevation: 0,
        centerTitle: false,
        backgroundColor: Colors.transparent,
        foregroundColor: RotixColors.textPrimary,
        titleTextStyle: GoogleFonts.nunito(
          fontSize: 18,
          fontWeight: FontWeight.w800,
          color: RotixColors.textPrimary,
        ),
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          backgroundColor: RotixColors.neon,
          foregroundColor: RotixColors.bgDeep,
        ),
      ),
      extensions: const <ThemeExtension<dynamic>>[
        SessionBackdrop(
          top: RotixColors.bgDeep,
          bottom: RotixColors.bgMid,
        ),
      ],
    );
  }
}

@immutable
class SessionBackdrop extends ThemeExtension<SessionBackdrop> {
  const SessionBackdrop({required this.top, required this.bottom});

  final Color top;
  final Color bottom;

  @override
  SessionBackdrop copyWith({Color? top, Color? bottom}) {
    return SessionBackdrop(top: top ?? this.top, bottom: bottom ?? this.bottom);
  }

  @override
  SessionBackdrop lerp(ThemeExtension<SessionBackdrop>? other, double t) {
    if (other is! SessionBackdrop) return this;
    return SessionBackdrop(
      top: Color.lerp(top, other.top, t)!,
      bottom: Color.lerp(bottom, other.bottom, t)!,
    );
  }
}
