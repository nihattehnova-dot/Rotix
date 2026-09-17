import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:sanal_ogretmen/core/branding/roti_mood.dart';
import 'package:sanal_ogretmen/core/theme/app_theme.dart';
import 'package:sanal_ogretmen/core/theme/rotix_surfaces.dart';
import 'package:sanal_ogretmen/features/branding/presentation/widgets/roti_mascot.dart';

/// Ortak sayfa kabuğu — Rotix paleti.
class BrandScaffold extends StatelessWidget {
  const BrandScaffold({
    super.key,
    required this.title,
    required this.child,
    this.rotiMood = RotiMood.idle,
    this.rotiSize = 100,
    this.showRoti = true,
    this.actions,
    this.footer,
  });

  final String title;
  final Widget child;
  final RotiMood rotiMood;
  final double rotiSize;
  final bool showRoti;
  final List<Widget>? actions;
  final Widget? footer;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: RotixBackdrop(
        child: SafeArea(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 8, 12, 0),
                child: Row(
                  children: [
                    Expanded(
                      child: Text(
                        title,
                        style: GoogleFonts.nunito(
                          fontSize: 24,
                          fontWeight: FontWeight.w900,
                          color: RotixColors.textPrimary,
                        ),
                      ),
                    ),
                    ...?actions,
                  ],
                ),
              ),
              if (showRoti) ...[
                const SizedBox(height: 4),
                Center(
                  child: RotiMascot(
                    mood: rotiMood,
                    size: rotiSize,
                    showBubble: false,
                    floating: true,
                  ),
                ),
              ],
              Expanded(child: child),
              if (footer != null) footer!,
            ],
          ),
        ),
      ),
    );
  }
}
