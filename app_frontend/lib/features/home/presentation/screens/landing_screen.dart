import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:sanal_ogretmen/core/branding/roti_mood.dart';
import 'package:sanal_ogretmen/core/theme/app_theme.dart';
import 'package:sanal_ogretmen/core/theme/rotix_surfaces.dart';
import 'package:sanal_ogretmen/features/branding/presentation/widgets/roti_mascot.dart';

class LandingScreen extends StatelessWidget {
  const LandingScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final size = MediaQuery.sizeOf(context);
    final wide = size.width >= 800;

    return Scaffold(
      body: RotixBackdrop(
        child: Stack(
          children: [
            Positioned(
              right: -80,
              top: -40,
              child: Container(
                width: 260,
                height: 260,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: RotixColors.neon.withOpacity(0.08),
                ),
              ),
            ),
            SafeArea(
              child: Padding(
                padding: EdgeInsets.symmetric(
                  horizontal: wide ? 64 : 24,
                  vertical: 20,
                ),
                child: Column(
                  children: [
                    Align(
                      alignment: Alignment.centerLeft,
                      child: Text(
                        'Rotix',
                        style: GoogleFonts.nunito(
                          fontSize: wide ? 42 : 34,
                          fontWeight: FontWeight.w900,
                          color: RotixColors.textPrimary,
                          letterSpacing: -0.5,
                        ),
                      ),
                    ),
                    Expanded(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const RotiMascot(
                            mood: RotiMood.welcome,
                            size: 160,
                            showBubble: false,
                          ),
                          const SizedBox(height: 18),
                          ConstrainedBox(
                            constraints: const BoxConstraints(maxWidth: 420),
                            child: Text(
                              'Akşam tekrarı, tahta ve sesli anlatım — Roti yanında.',
                              textAlign: TextAlign.center,
                              style: GoogleFonts.nunito(
                                fontSize: wide ? 18 : 16,
                                height: 1.35,
                                color: RotixColors.textMuted,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ),
                          const SizedBox(height: 32),
                          ConstrainedBox(
                            constraints: const BoxConstraints(maxWidth: 360),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.stretch,
                              children: [
                                _HeroButton(
                                  label: '1 hafta ücretsiz başla',
                                  filled: true,
                                  onTap: () => context.go('/onboarding'),
                                ),
                                const SizedBox(height: 12),
                                _HeroButton(
                                  label: 'Uygulamaya gir',
                                  filled: false,
                                  onTap: () => context.go('/app'),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                    Text(
                      'iOS · Android · Web',
                      style: GoogleFonts.nunito(
                        color: RotixColors.textMuted.withOpacity(0.6),
                        fontSize: 12,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _HeroButton extends StatelessWidget {
  const _HeroButton({
    required this.label,
    required this.filled,
    required this.onTap,
  });

  final String label;
  final bool filled;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: filled ? RotixColors.neon : Colors.transparent,
      borderRadius: BorderRadius.circular(18),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(18),
        child: Container(
          height: 56,
          alignment: Alignment.center,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(18),
            border: filled
                ? null
                : Border.all(color: RotixColors.neon.withOpacity(0.7), width: 1.6),
            boxShadow: filled ? neonGlow(blur: 18) : null,
          ),
          child: Text(
            label,
            style: GoogleFonts.nunito(
              fontSize: 16,
              fontWeight: FontWeight.w800,
              color: filled ? RotixColors.bgDeep : RotixColors.textPrimary,
            ),
          ),
        ),
      ),
    );
  }
}
