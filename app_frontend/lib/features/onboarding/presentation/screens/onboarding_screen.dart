import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';

class OnboardingScreen extends StatefulWidget {
  const OnboardingScreen({super.key});

  @override
  State<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends State<OnboardingScreen> {
  int grade = 5;
  String track = 'school';
  final nameCtrl = TextEditingController(text: 'Elif');

  @override
  void dispose() {
    nameCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Kurulum')),
      body: ListView(
        padding: const EdgeInsets.all(24),
        children: [
          Text(
            'Rotix’e hoş geldin',
            style: GoogleFonts.nunito(
              fontSize: 24,
              fontWeight: FontWeight.w800,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            '1 haftalık deneme hemen başlar. Roti yanında olacak!',
            style: GoogleFonts.nunito(color: const Color(0xFF64748B)),
          ),
          const SizedBox(height: 24),
          TextField(
            controller: nameCtrl,
            decoration: const InputDecoration(labelText: 'Öğrenci adı'),
          ),
          const SizedBox(height: 16),
          Text('Sınıf: $grade', style: GoogleFonts.sourceSans3()),
          Slider(
            value: grade.toDouble(),
            min: 1,
            max: 12,
            divisions: 11,
            label: '$grade',
            onChanged: (v) => setState(() => grade = v.round()),
          ),
          const SizedBox(height: 8),
          Text('Hedef', style: GoogleFonts.sourceSans3()),
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            children: [
              for (final t in [
                ('school', 'Okul'),
                ('lgs', 'LGS'),
                ('tyt', 'TYT'),
                ('ayt', 'AYT'),
                ('yks', 'YKS'),
              ])
                ChoiceChip(
                  label: Text(t.$2),
                  selected: track == t.$1,
                  onSelected: (_) => setState(() => track = t.$1),
                ),
            ],
          ),
          const SizedBox(height: 32),
          FilledButton(
            onPressed: () => context.go('/app'),
            child: const Text('Denemeyi başlat'),
          ),
        ],
      ),
    );
  }
}
