import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:sanal_ogretmen/core/constants/grade_levels.dart';

/// Visual tokens per pedagogical band (not a purple/cream AI-default look).
class GradeAdaptiveTheme {
  const GradeAdaptiveTheme({
    required this.band,
    required this.accent,
    required this.accentSoft,
    required this.surfaceTint,
    required this.headlineStyle,
    required this.encouragement,
    required this.uiDensity,
  });

  final PedagogicalBand band;
  final Color accent;
  final Color accentSoft;
  final Color surfaceTint;
  final TextStyle headlineStyle;
  final String encouragement;
  final VisualDensity uiDensity;

  factory GradeAdaptiveTheme.forGrade(int grade) {
    final band = bandForGrade(grade);
    switch (band) {
      case PedagogicalBand.primary:
        return GradeAdaptiveTheme(
          band: band,
          accent: const Color(0xFF0D9488),
          accentSoft: const Color(0xFFCCFBF1),
          surfaceTint: const Color(0xFFE0F7F4),
          headlineStyle: GoogleFonts.nunito(
            fontWeight: FontWeight.w800,
            fontSize: 22,
            color: const Color(0xFF134E4A),
          ),
          encouragement: 'Harika gidiyorsun — birlikte çözelim!',
          uiDensity: VisualDensity.comfortable,
        );
      case PedagogicalBand.middle:
        return GradeAdaptiveTheme(
          band: band,
          accent: const Color(0xFF0369A1),
          accentSoft: const Color(0xFFE0F2FE),
          surfaceTint: const Color(0xFFEFF6FF),
          headlineStyle: GoogleFonts.sourceSans3(
            fontWeight: FontWeight.w700,
            fontSize: 20,
            color: const Color(0xFF0C4A6E),
          ),
          encouragement: 'Adım adım düşün — ipucu yolda.',
          uiDensity: VisualDensity.standard,
        );
      case PedagogicalBand.examLgs:
        return GradeAdaptiveTheme(
          band: band,
          accent: const Color(0xFFB45309),
          accentSoft: const Color(0xFFFEF3C7),
          surfaceTint: const Color(0xFFFFFBEB),
          headlineStyle: GoogleFonts.sourceSans3(
            fontWeight: FontWeight.w700,
            fontSize: 19,
            color: const Color(0xFF78350F),
          ),
          encouragement: 'LGS temposu: önce yöntem, sonra hız.',
          uiDensity: VisualDensity.compact,
        );
      case PedagogicalBand.high:
        return GradeAdaptiveTheme(
          band: band,
          accent: const Color(0xFF1D4ED8),
          accentSoft: const Color(0xFFDBEAFE),
          surfaceTint: const Color(0xFFF8FAFC),
          headlineStyle: GoogleFonts.ibmPlexSans(
            fontWeight: FontWeight.w600,
            fontSize: 19,
            color: const Color(0xFF1E293B),
          ),
          encouragement: 'Takıldığın adımı söyle, birlikte bakalım.',
          uiDensity: VisualDensity.compact,
        );
      case PedagogicalBand.examYks:
        return GradeAdaptiveTheme(
          band: band,
          accent: const Color(0xFF334155),
          accentSoft: const Color(0xFFE2E8F0),
          surfaceTint: const Color(0xFFF1F5F9),
          headlineStyle: GoogleFonts.ibmPlexSans(
            fontWeight: FontWeight.w600,
            fontSize: 18,
            color: const Color(0xFF0F172A),
          ),
          encouragement: 'YKS odağı: netlik ve tekrar aralığı.',
          uiDensity: VisualDensity.compact,
        );
    }
  }
}
