import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:sanal_ogretmen/core/constants/grade_levels.dart';
import 'package:sanal_ogretmen/core/theme/grade_adaptive_theme.dart';

/// Shows grade + pedagogical band so UI/voice adaptation is visible in MVP.
class GradeBadge extends StatelessWidget {
  const GradeBadge({
    super.key,
    required this.gradeLevel,
    required this.theme,
  });

  final int gradeLevel;
  final GradeAdaptiveTheme theme;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      label: '${gradeLabelTr(gradeLevel)}, ${bandLabelTr(theme.band)}',
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: theme.accentSoft,
          border: Border(
            left: BorderSide(color: theme.accent, width: 3),
          ),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              gradeLabelTr(gradeLevel),
              style: GoogleFonts.ibmPlexSans(
                fontWeight: FontWeight.w700,
                fontSize: 14,
                color: theme.accent,
              ),
            ),
            const SizedBox(height: 2),
            Text(
              bandLabelTr(theme.band),
              style: GoogleFonts.sourceSans3(
                fontSize: 12,
                color: const Color(0xFF475569),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
