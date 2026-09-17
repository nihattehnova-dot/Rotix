import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:sanal_ogretmen/core/branding/roti_mood.dart';
import 'package:sanal_ogretmen/core/providers/api_providers.dart';
import 'package:sanal_ogretmen/core/theme/app_theme.dart';
import 'package:sanal_ogretmen/core/theme/rotix_surfaces.dart';
import 'package:sanal_ogretmen/features/branding/presentation/widgets/roti_mascot.dart';

class HomeShellScreen extends ConsumerWidget {
  const HomeShellScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final quota = ref.watch(quotaSnapshotProvider);
    final access = ref.watch(accessInfoProvider);
    const studentName = 'Elif';
    const streakDays = 5;

    final used = quota.maybeWhen(
      data: (q) => q.dailyMinutesUsed,
      orElse: () => 18.0,
    );
    final limit = quota.maybeWhen(
      data: (q) => q.dailyMinutesLimit <= 0 ? 30.0 : q.dailyMinutesLimit,
      orElse: () => 30.0,
    );
    return Scaffold(
      body: RotixBackdrop(
        child: SafeArea(
          child: ListView(
            padding: const EdgeInsets.fromLTRB(20, 10, 20, 28),
            children: [
              _TopBar(
                streakDays: streakDays,
                minutesUsed: used.round(),
                minutesLimit: limit.round(),
              ),
              const SizedBox(height: 18),
              _WelcomeHero(
                studentName: studentName,
                questionQuota: quota.maybeWhen(
                  data: (q) => q.remainingMonthlyQuestions ?? 45,
                  orElse: () => 45,
                ),
                onStart: () => context.go('/app/evening'),
              ),
              const SizedBox(height: 22),
              Text(
                'Bugün ne yapalım?',
                style: GoogleFonts.nunito(
                  fontSize: 20,
                  fontWeight: FontWeight.w800,
                  color: RotixColors.textPrimary,
                ),
              ),
              const SizedBox(height: 12),
              GridView.count(
                crossAxisCount: 2,
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                mainAxisSpacing: 12,
                crossAxisSpacing: 12,
                childAspectRatio: 0.98,
                children: [
                  _ModuleCard(
                    title: 'Soru Sor',
                    subtitle: 'Roti ile tahtada adım adım',
                    icon: Icons.nightlight_round,
                    neonSelected: true,
                    onTap: () => context.go('/app/evening'),
                  ),
                  _ModuleCard(
                    title: 'Ödev Desteği',
                    subtitle: 'Takıldığın soruya adım adım yardım',
                    icon: Icons.menu_book_rounded,
                    onTap: () => context.go('/app/homework'),
                  ),
                  _ModuleCard(
                    title: 'Eksik / Güç Haritası',
                    subtitle: 'Konu ustalığını incele',
                    icon: Icons.insights_rounded,
                    onTap: () => context.go('/app/weak'),
                  ),
                  _ModuleCard(
                    title: 'Unutma Defteri',
                    subtitle: 'Unutma eğrisi tekrarları',
                    icon: Icons.replay_circle_filled_rounded,
                    onTap: () => context.go('/app/evening'),
                  ),
                ],
              ),
              const SizedBox(height: 14),
              Row(
                children: [
                  Expanded(
                    child: GlassPill(
                      onTap: () => context.go('/app/parent'),
                      child: Center(
                        child: Text(
                          'Veli',
                          style: GoogleFonts.nunito(
                            color: RotixColors.textMuted,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: GlassPill(
                      onTap: () => context.go('/app/plans'),
                      child: Center(
                        child: Text(
                          'Paketler',
                          style: GoogleFonts.nunito(
                            color: RotixColors.textMuted,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
              access.maybeWhen(
                data: (a) => a.allowed
                    ? const SizedBox.shrink()
                    : Padding(
                        padding: const EdgeInsets.only(top: 12),
                        child: Text(
                          'Deneme bitti — paketlerden devam edebilirsin.',
                          style: GoogleFonts.nunito(
                            color: RotixColors.streak,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                orElse: () => const SizedBox.shrink(),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _TopBar extends StatelessWidget {
  const _TopBar({
    required this.streakDays,
    required this.minutesUsed,
    required this.minutesLimit,
  });

  final int streakDays;
  final int minutesUsed;
  final int minutesLimit;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Row(
          children: [
            Container(
              width: 34,
              height: 34,
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(10),
                gradient: const LinearGradient(
                  colors: [RotixColors.neon, RotixColors.neonSoft],
                ),
                boxShadow: neonGlow(blur: 14),
              ),
              child: Center(
                child: Text(
                  'R',
                  style: GoogleFonts.nunito(
                    color: RotixColors.bgDeep,
                    fontWeight: FontWeight.w900,
                    fontSize: 18,
                  ),
                ),
              ),
            ),
            const SizedBox(width: 8),
            Text(
              'Rotix',
              style: GoogleFonts.nunito(
                fontSize: 22,
                fontWeight: FontWeight.w900,
                color: RotixColors.textPrimary,
              ),
            ),
          ],
        ),
        const SizedBox(width: 12),
        GlassPill(
          onTap: () => context.go('/login'),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              CircleAvatar(
                radius: 12,
                backgroundColor: RotixColors.neonSoft.withOpacity(0.35),
                child: const Icon(
                  Icons.person_rounded,
                  size: 16,
                  color: RotixColors.textPrimary,
                ),
              ),
              const SizedBox(width: 6),
              Text(
                'Giriş',
                style: GoogleFonts.nunito(
                  color: RotixColors.textMuted,
                  fontWeight: FontWeight.w700,
                  fontSize: 13,
                ),
              ),
            ],
          ),
        ),
        const Spacer(),
        GlassPill(
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(
                Icons.local_fire_department_rounded,
                size: 16,
                color: RotixColors.streak,
              ),
              const SizedBox(width: 4),
              Text(
                '$streakDays Gün',
                style: GoogleFonts.nunito(
                  color: RotixColors.streak,
                  fontWeight: FontWeight.w800,
                  fontSize: 13,
                ),
              ),
            ],
          ),
        ),
        const SizedBox(width: 8),
        GlassPill(
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(
                Icons.timer_rounded,
                size: 15,
                color: RotixColors.timeBadge,
              ),
              const SizedBox(width: 4),
              Text(
                '$minutesUsed/$minutesLimit dk',
                style: GoogleFonts.nunito(
                  color: RotixColors.timeBadge,
                  fontWeight: FontWeight.w700,
                  fontSize: 12,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _WelcomeHero extends StatelessWidget {
  const _WelcomeHero({
    required this.studentName,
    required this.questionQuota,
    required this.onStart,
  });

  final String studentName;
  final int questionQuota;
  final VoidCallback onStart;

  @override
  Widget build(BuildContext context) {
    return GlassCard(
      padding: const EdgeInsets.fromLTRB(18, 18, 8, 16),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text.rich(
                  TextSpan(
                    children: [
                      TextSpan(
                        text: 'Selam $studentName! ',
                        style: GoogleFonts.nunito(
                          fontSize: 26,
                          fontWeight: FontWeight.w900,
                          color: RotixColors.textPrimary,
                          height: 1.15,
                        ),
                      ),
                      const TextSpan(text: '👋', style: TextStyle(fontSize: 24)),
                    ],
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  'Takıldığın soruyu sor — Roti tahtada adım adım yönlendirir.',
                  style: GoogleFonts.nunito(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    color: RotixColors.textMuted,
                    height: 1.4,
                  ),
                ),
                const SizedBox(height: 16),
                DecoratedBox(
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(16),
                    boxShadow: neonGlow(blur: 18),
                  ),
                  child: FilledButton.icon(
                    onPressed: onStart,
                    style: FilledButton.styleFrom(
                      backgroundColor: RotixColors.neonSoft,
                      foregroundColor: RotixColors.textPrimary,
                      padding: const EdgeInsets.symmetric(
                        horizontal: 18,
                        vertical: 14,
                      ),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(16),
                      ),
                    ),
                    icon: const Icon(Icons.mic_rounded, size: 22),
                    label: Text(
                      'SORU SOR ($questionQuota kalan)',
                      style: GoogleFonts.nunito(
                        fontWeight: FontWeight.w900,
                        fontSize: 14,
                        letterSpacing: 0.2,
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
          const RotiMascot(
            mood: RotiMood.welcome,
            size: 118,
            showBubble: false,
          ),
        ],
      ),
    );
  }
}

class _ModuleCard extends StatelessWidget {
  const _ModuleCard({
    required this.title,
    required this.subtitle,
    required this.icon,
    required this.onTap,
    this.neonSelected = false,
  });

  final String title;
  final String subtitle;
  final IconData icon;
  final VoidCallback onTap;
  final bool neonSelected;

  @override
  Widget build(BuildContext context) {
    return GlassCard(
      neonSelected: neonSelected,
      onTap: onTap,
      padding: const EdgeInsets.fromLTRB(14, 14, 14, 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              color: RotixColors.neon.withOpacity(neonSelected ? 0.22 : 0.12),
              borderRadius: BorderRadius.circular(14),
              boxShadow: neonSelected ? neonGlow(blur: 12) : null,
            ),
            child: Icon(icon, color: RotixColors.neon, size: 24),
          ),
          const Spacer(),
          Text(
            title,
            style: GoogleFonts.nunito(
              color: RotixColors.textPrimary,
              fontWeight: FontWeight.w800,
              fontSize: 15,
              height: 1.2,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            subtitle,
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
            style: GoogleFonts.nunito(
              color: RotixColors.textMuted,
              fontWeight: FontWeight.w600,
              fontSize: 11.5,
              height: 1.3,
            ),
          ),
        ],
      ),
    );
  }
}
