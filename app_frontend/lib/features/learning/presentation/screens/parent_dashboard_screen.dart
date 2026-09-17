import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:sanal_ogretmen/core/providers/api_providers.dart';

final _parentProvider = FutureProvider<Map<String, dynamic>>((ref) async {
  return ref.watch(learningApiProvider).parentDashboard();
});

class ParentDashboardScreen extends ConsumerWidget {
  const ParentDashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final dash = ref.watch(_parentProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Veli paneli')),
      body: dash.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Padding(
          padding: const EdgeInsets.all(24),
          child: Text(
            'Veli paneli için kullanıcı rolü parent olmalı.\n\n$e',
            style: GoogleFonts.sourceSans3(),
          ),
        ),
        data: (data) {
          final children =
              (data['children'] as List<dynamic>? ?? const []);
          if (children.isEmpty) {
            return Center(
              child: Text(
                'Bağlı öğrenci yok. parent_user_id ile eşleştirin.',
                style: GoogleFonts.sourceSans3(),
              ),
            );
          }
          return ListView.builder(
            padding: const EdgeInsets.all(20),
            itemCount: children.length,
            itemBuilder: (context, i) {
              final row = children[i] as Map<String, dynamic>;
              final student =
                  row['student'] as Map<String, dynamic>? ?? const {};
              final due = row['dueMistakesCount'] as int? ?? 0;
              final dueTopics = row['dueTopicCount'] as int? ?? 0;
              final gaps =
                  (row['gapTopics'] as List<dynamic>? ?? const []);
              return Padding(
                padding: const EdgeInsets.only(bottom: 16),
                child: DecoratedBox(
                  decoration: const BoxDecoration(
                    border: Border(
                      bottom: BorderSide(color: Color(0xFFE2E8F0)),
                    ),
                  ),
                  child: Padding(
                    padding: const EdgeInsets.only(bottom: 12),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          student['full_name'] as String? ?? 'Öğrenci',
                          style: GoogleFonts.ibmPlexSans(
                            fontSize: 18,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                        Text(
                          'Sınıf ${student['grade_level']} · '
                          'Seri ${student['streak_count']} · '
                          'Puan ${student['total_points']}',
                          style: GoogleFonts.sourceSans3(
                            color: const Color(0xFF64748B),
                          ),
                        ),
                        const SizedBox(height: 6),
                        Text(
                          'Tekrar bekleyen: $dueTopics konu ($due kayıt)',
                          style: GoogleFonts.sourceSans3(
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        if (gaps.isNotEmpty) ...[
                          const SizedBox(height: 8),
                          Text(
                            'Eksik / zayıf konular',
                            style: GoogleFonts.ibmPlexSans(
                              fontWeight: FontWeight.w700,
                              fontSize: 14,
                            ),
                          ),
                          const SizedBox(height: 4),
                          ...gaps.take(5).map((raw) {
                            final g = raw as Map<String, dynamic>;
                            final subject = g['subject'] as String? ?? '';
                            final topic = g['topic'] as String? ?? '';
                            final open = g['openMistakes'] as int? ?? 0;
                            final mastery = g['masteryScore'];
                            final masteryLabel = mastery is num
                                ? ' · ustalık ${mastery.round()}'
                                : '';
                            return Padding(
                              padding: const EdgeInsets.only(top: 2),
                              child: Text(
                                '• $subject / $topic'
                                '${open > 0 ? ' ($open açık)' : ''}'
                                '$masteryLabel',
                                style: GoogleFonts.sourceSans3(
                                  fontSize: 13,
                                  color: const Color(0xFF334155),
                                ),
                              ),
                            );
                          }),
                        ],
                      ],
                    ),
                  ),
                ),
              );
            },
          );
        },
      ),
    );
  }
}
