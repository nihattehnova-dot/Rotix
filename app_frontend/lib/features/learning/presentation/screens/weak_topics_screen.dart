import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:sanal_ogretmen/core/providers/api_providers.dart';

final _weakProvider =
    FutureProvider<List<Map<String, dynamic>>>((ref) async {
  return ref.watch(learningApiProvider).weakTopics();
});

class WeakTopicsScreen extends ConsumerWidget {
  const WeakTopicsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final weak = ref.watch(_weakProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Eksik / güç haritası')),
      body: weak.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text('$e')),
        data: (topics) {
          if (topics.isEmpty) {
            return Center(
              child: Text(
                'Henüz veri yok — mikro test ve soru turları dolduracak.',
                style: GoogleFonts.sourceSans3(),
                textAlign: TextAlign.center,
              ),
            );
          }
          return ListView.separated(
            padding: const EdgeInsets.all(20),
            itemCount: topics.length,
            separatorBuilder: (_, __) => const Divider(height: 1),
            itemBuilder: (context, i) {
              final t = topics[i];
              final score =
                  (t['mastery_score'] as num?)?.toDouble() ?? 0;
              return ListTile(
                title: Text(
                  '${t['subject']} · ${t['topic']}',
                  style: GoogleFonts.ibmPlexSans(fontWeight: FontWeight.w600),
                ),
                subtitle: LinearProgressIndicator(
                  value: score / 100,
                  color: score < 40
                      ? const Color(0xFFB45309)
                      : const Color(0xFF0F766E),
                  backgroundColor: const Color(0xFFE2E8F0),
                ),
                trailing: Text('${score.toStringAsFixed(0)}%'),
              );
            },
          );
        },
      ),
    );
  }
}
