import 'dart:convert';

import 'package:flutter/services.dart';

/// Offline / API-fallback catalog from `assets/data/curriculum_flat.json`.
class CurriculumCatalog {
  CurriculumCatalog._();

  static CurriculumCatalog? _instance;
  static CurriculumCatalog get instance => _instance ??= CurriculumCatalog._();

  List<Map<String, dynamic>> _items = const [];
  bool _loaded = false;

  bool get isLoaded => _loaded;
  List<Map<String, dynamic>> get items => _items;

  Future<void> ensureLoaded() async {
    if (_loaded) return;
    try {
      final raw = await rootBundle.loadString(
        'assets/data/curriculum_flat.json',
      );
      final decoded = jsonDecode(raw) as Map<String, dynamic>;
      final list = decoded['items'] as List<dynamic>? ?? const [];
      _items = list.whereType<Map<String, dynamic>>().toList();
      _loaded = true;
    } catch (_) {
      _items = const [];
      _loaded = true;
    }
  }

  List<Map<String, dynamic>> forGrade(int grade, {String? subject}) {
    return _items.where((item) {
      if (item['grade'] != grade) return false;
      if (subject == null) return true;
      return (item['subject'] as String?) == subject;
    }).toList();
  }

  List<Map<String, dynamic>> forExam(String exam, {String? subject}) {
    final key = exam.toUpperCase();
    return _items.where((item) {
      final g = item['grade'];
      if (g is! String || g.toUpperCase() != key) return false;
      if (subject == null) return true;
      return (item['subject'] as String?) == subject;
    }).toList();
  }

  List<String> subjectsForGrade(int grade) {
    final set = <String>{};
    for (final item in forGrade(grade)) {
      final s = item['subject'] as String?;
      if (s != null) set.add(s);
    }
    final list = set.toList()..sort();
    return list;
  }
}
