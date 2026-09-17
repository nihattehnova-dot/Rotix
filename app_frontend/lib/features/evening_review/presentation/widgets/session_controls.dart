import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:sanal_ogretmen/core/theme/app_theme.dart';
import 'package:sanal_ogretmen/core/theme/grade_adaptive_theme.dart';
import 'package:sanal_ogretmen/core/theme/rotix_surfaces.dart';
import 'package:sanal_ogretmen/core/models/user_mistake.dart';
import 'package:sanal_ogretmen/features/evening_review/providers/evening_review_provider.dart';

/// Alt kontrol: Fotoğraf · Unutma tekrarı · Temizle · Mikrofon · İpucu
class SessionControls extends StatelessWidget {
  SessionControls({
    super.key,
    required this.state,
    required this.theme,
    required this.onToggleMic,
    required this.onClearBoard,
    required this.onAskSocratic,
    required this.onDueMistakeTap,
    this.onPhotoTap,
  });

  final EveningReviewState state;
  final GradeAdaptiveTheme theme;
  final VoidCallback onToggleMic;
  final VoidCallback onClearBoard;
  final VoidCallback onAskSocratic;
  final ValueChanged<UserMistake> onDueMistakeTap;
  final VoidCallback? onPhotoTap;

  @override
  Widget build(BuildContext context) {
    final busy = state.isOnlineAction;
    final listening = state.isMicActive;
    final due = state.dueMistakes;

    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        if (onPhotoTap != null)
          Align(
            alignment: Alignment.centerLeft,
            child: ActionChip(
              avatar: const Icon(Icons.photo_camera_rounded,
                  size: 16, color: RotixColors.neon),
              label: Text(
                'Fotoğrafla sor',
                style: GoogleFonts.nunito(
                  fontWeight: FontWeight.w700,
                  fontSize: 12,
                  color: RotixColors.textPrimary,
                ),
              ),
              backgroundColor: RotixColors.glass.withOpacity(0.55),
              onPressed: busy ? null : onPhotoTap,
            ),
          ),
        if (onPhotoTap != null) const SizedBox(height: 8),
        if (due.isNotEmpty)
          SizedBox(
            height: 38,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              itemCount: due.length.clamp(0, 5),
              separatorBuilder: (_, __) => const SizedBox(width: 8),
              itemBuilder: (context, i) {
                final m = due[i];
                final label = [
                  if (m.subject != null && m.subject!.isNotEmpty) m.subject,
                  m.topic ?? 'Tekrar',
                ].whereType<String>().join(' · ');
                return ActionChip(
                  avatar: const Icon(Icons.replay_rounded,
                      size: 16, color: RotixColors.timeBadge),
                  label: Text(
                    label,
                    style: GoogleFonts.nunito(
                      fontWeight: FontWeight.w700,
                      fontSize: 12,
                      color: RotixColors.textPrimary,
                    ),
                  ),
                  backgroundColor: RotixColors.glass.withOpacity(0.55),
                  onPressed: busy ? null : () => onDueMistakeTap(m),
                );
              },
            ),
          ),
        if (due.isNotEmpty) const SizedBox(height: 10),
        GlassCard(
          padding: const EdgeInsets.fromLTRB(10, 12, 10, 10),
          radius: 28,
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Expanded(
                child: _SideAction(
                  icon: Icons.brush_outlined,
                  label: 'Tahtayı\nTemizle',
                  onTap: onClearBoard,
                ),
              ),
              Expanded(
                flex: 2,
                child: Column(
                  children: [
                    GestureDetector(
                      onTap: busy ? null : onToggleMic,
                      child: AnimatedContainer(
                        duration: const Duration(milliseconds: 220),
                        width: listening ? 92 : 80,
                        height: listening ? 92 : 80,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          gradient: const LinearGradient(
                            begin: Alignment.topLeft,
                            end: Alignment.bottomRight,
                            colors: [RotixColors.neon, RotixColors.neonSoft],
                          ),
                          boxShadow: neonGlow(
                            blur: listening ? 32 : 22,
                            spread: listening ? 2 : 0,
                          ),
                        ),
                        child: Icon(
                          listening ? Icons.mic : Icons.mic_none_rounded,
                          color: RotixColors.bgDeep,
                          size: 38,
                        ),
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      listening ? 'Dinliyorum…' : 'Soru Sor / Konuş',
                      textAlign: TextAlign.center,
                      style: GoogleFonts.nunito(
                        color: RotixColors.textPrimary,
                        fontWeight: FontWeight.w800,
                        fontSize: 13,
                      ),
                    ),
                  ],
                ),
              ),
              Expanded(
                child: _SideAction(
                  icon: Icons.lightbulb_outline_rounded,
                  label: 'İpucu',
                  onTap: busy ? null : onAskSocratic,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _SideAction extends StatelessWidget {
  const _SideAction({
    required this.icon,
    required this.label,
    required this.onTap,
  });

  final IconData icon;
  final String label;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 6, horizontal: 4),
        child: Column(
          children: [
            Container(
              width: 48,
              height: 48,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: RotixColors.glass.withOpacity(0.45),
                border: Border.all(color: Colors.white.withOpacity(0.10)),
              ),
              child: Icon(icon, color: RotixColors.textPrimary, size: 22),
            ),
            const SizedBox(height: 6),
            Text(
              label,
              textAlign: TextAlign.center,
              style: GoogleFonts.nunito(
                color: RotixColors.textMuted,
                fontSize: 11,
                fontWeight: FontWeight.w700,
                height: 1.15,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
