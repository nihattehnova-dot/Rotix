import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:sanal_ogretmen/core/branding/roti_mood.dart';
import 'package:sanal_ogretmen/core/providers/api_providers.dart';
import 'package:sanal_ogretmen/features/branding/presentation/widgets/roti_mascot.dart';

class MicroQuizScreen extends ConsumerStatefulWidget {
  const MicroQuizScreen({
    super.key,
    required this.curriculumId,
    required this.subject,
    required this.topic,
  });

  final String curriculumId;
  final String subject;
  final String topic;

  @override
  ConsumerState<MicroQuizScreen> createState() => _MicroQuizScreenState();
}

class _MicroQuizScreenState extends ConsumerState<MicroQuizScreen> {
  Map<String, dynamic>? quiz;
  List<Map<String, dynamic>> questions = [];
  final answers = <int, int>{};
  bool loading = true;
  bool submitting = false;
  String? error;
  Map<String, dynamic>? result;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      loading = true;
      error = null;
    });
    try {
      final q = await ref
          .read(learningApiProvider)
          .microQuiz(widget.curriculumId);
      if (q == null) {
        setState(() {
          loading = false;
          error = 'Bu konu için mikro test yok.';
        });
        return;
      }
      final qs = (q['questions'] as List<dynamic>? ?? const [])
          .whereType<Map>()
          .map((e) => Map<String, dynamic>.from(e))
          .toList();
      setState(() {
        quiz = q;
        questions = qs;
        loading = false;
      });
    } catch (e) {
      setState(() {
        loading = false;
        error = '$e';
      });
    }
  }

  Future<void> _submit() async {
    if (quiz == null || answers.length < questions.length) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Tüm soruları cevaplayın')),
      );
      return;
    }
    setState(() => submitting = true);
    try {
      final ordered = List<int>.generate(
        questions.length,
        (i) => answers[i] ?? -1,
      );
      final res = await ref.read(learningApiProvider).submitMicroQuiz(
            quizId: quiz!['id'] as String,
            answers: ordered,
            subject: widget.subject,
            topic: widget.topic,
          );
      setState(() => result = res);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('$e')),
        );
      }
    } finally {
      if (mounted) setState(() => submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(
          'Mikro test · ${widget.topic}',
          style: GoogleFonts.ibmPlexSans(fontWeight: FontWeight.w600),
        ),
      ),
      body: loading
          ? const Center(child: CircularProgressIndicator())
          : error != null
              ? Center(
                  child: Padding(
                    padding: const EdgeInsets.all(24),
                    child: Text(error!, textAlign: TextAlign.center),
                  ),
                )
              : result != null
                  ? _ResultView(
                      score: (result!['score'] as num?)?.toDouble() ?? 0,
                      correct: result!['correct'] as int? ?? 0,
                      total: result!['total'] as int? ?? 0,
                      onDone: () => context.pop(),
                    )
                  : ListView(
                      padding: const EdgeInsets.all(20),
                      children: [
                        Text(
                          'Anlatım sonrası kısa kontrol — Gemini maliyeti yok.',
                          style: GoogleFonts.sourceSans3(
                            color: const Color(0xFF64748B),
                          ),
                        ),
                        const SizedBox(height: 16),
                        for (var i = 0; i < questions.length; i++) ...[
                          Text(
                            '${i + 1}. ${questions[i]['prompt']}',
                            style: GoogleFonts.ibmPlexSans(
                              fontWeight: FontWeight.w600,
                              fontSize: 16,
                            ),
                          ),
                          const SizedBox(height: 8),
                          ...List.generate(
                            (questions[i]['choices'] as List<dynamic>? ?? [])
                                .length,
                            (ci) {
                              final choice =
                                  (questions[i]['choices'] as List)[ci];
                              return RadioListTile<int>(
                                value: ci,
                                groupValue: answers[i],
                                title: Text('$choice'),
                                onChanged: (v) =>
                                    setState(() => answers[i] = v ?? 0),
                              );
                            },
                          ),
                          const SizedBox(height: 12),
                        ],
                        FilledButton(
                          onPressed: submitting ? null : _submit,
                          child: Text(submitting ? 'Gönderiliyor…' : 'Bitir'),
                        ),
                      ],
                    ),
    );
  }
}

class _ResultView extends StatelessWidget {
  const _ResultView({
    required this.score,
    required this.correct,
    required this.total,
    required this.onDone,
  });

  final double score;
  final int correct;
  final int total;
  final VoidCallback onDone;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const RotiMascot(mood: RotiMood.celebrate, size: 100),
                  const SizedBox(height: 12),
                  Text(
                    '%${score.toStringAsFixed(0)}',
                    style: GoogleFonts.nunito(
                      fontSize: 48,
                      fontWeight: FontWeight.w800,
                      color: const Color(0xFF0F766E),
                    ),
                  ),
                  Text(
                    '$correct / $total doğru · Roti gurur duyuyor!',
                    style: GoogleFonts.nunito(),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 20),
                  FilledButton(onPressed: onDone, child: const Text('Tamam')),
                ],
              ),
      ),
    );
  }
}
