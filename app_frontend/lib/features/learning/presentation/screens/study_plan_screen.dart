import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:sanal_ogretmen/core/providers/api_providers.dart';

class StudyPlanScreen extends ConsumerWidget {
  const StudyPlanScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final plan = ref.watch(todayPlanProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Günlük plan'),
        actions: [
          IconButton(
            tooltip: 'Yeniden üret',
            onPressed: () async {
              await ref.read(learningApiProvider).generatePlan();
              ref.invalidate(todayPlanProvider);
            },
            icon: const Icon(Icons.refresh),
          ),
        ],
      ),
      body: plan.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Text(
              'Plan yüklenemedi.\n$e',
              textAlign: TextAlign.center,
            ),
          ),
        ),
        data: (p) => ListView(
          padding: const EdgeInsets.all(20),
          children: [
            Text(
              p.planDate,
              style: GoogleFonts.sourceSans3(color: const Color(0xFF64748B)),
            ),
            Text(
              'Kaynak: ${p.generatedBy == 'rules' ? 'kural motoru (LLM yok)' : p.generatedBy}',
              style: GoogleFonts.sourceSans3(fontSize: 12),
            ),
            const SizedBox(height: 16),
            for (final item in p.items)
              ListTile(
                contentPadding: EdgeInsets.zero,
                leading: Icon(
                  item.source == 'mistake'
                      ? Icons.replay
                      : Icons.menu_book_outlined,
                  color: const Color(0xFF0F766E),
                ),
                title: Text(
                  '${item.subject} · ${item.topic}',
                  style: GoogleFonts.ibmPlexSans(fontWeight: FontWeight.w600),
                ),
                subtitle: Text('${item.minutes} dk · ${item.source}'),
                trailing: Icon(
                  item.done
                      ? Icons.check_circle
                      : Icons.radio_button_unchecked,
                  color: item.done
                      ? const Color(0xFF0F766E)
                      : const Color(0xFF94A3B8),
                ),
              ),
          ],
        ),
      ),
    );
  }
}
