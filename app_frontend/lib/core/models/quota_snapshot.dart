class QuotaSnapshot {
  const QuotaSnapshot({
    required this.tier,
    required this.dailyMinutesLimit,
    required this.monthlyQuestionsLimit,
    required this.dailyMinutesUsed,
    required this.dailyQuestionsUsed,
    required this.monthlyMinutesUsed,
    required this.monthlyQuestionsUsed,
    this.remainingDailyMinutes,
    this.remainingMonthlyQuestions,
  });

  final String tier;
  final double dailyMinutesLimit;
  final int monthlyQuestionsLimit;
  final double dailyMinutesUsed;
  final int dailyQuestionsUsed;
  final double monthlyMinutesUsed;
  final int monthlyQuestionsUsed;
  final double? remainingDailyMinutes;
  final int? remainingMonthlyQuestions;

  factory QuotaSnapshot.fromJson(Map<String, dynamic> json) {
    final limits = json['limits'] as Map<String, dynamic>? ?? const {};
    final usage = json['usage'] as Map<String, dynamic>? ?? const {};
    final remaining = json['remaining'] as Map<String, dynamic>? ?? const {};

    return QuotaSnapshot(
      tier: json['tier'] as String? ?? 'basic',
      dailyMinutesLimit: (limits['dailyMinutes'] as num?)?.toDouble() ?? 0,
      monthlyQuestionsLimit:
          (limits['monthlyQuestions'] as num?)?.toInt() ?? 0,
      dailyMinutesUsed:
          (usage['dailyMinutesUsed'] as num?)?.toDouble() ?? 0,
      dailyQuestionsUsed:
          (usage['dailyQuestionsUsed'] as num?)?.toInt() ?? 0,
      monthlyMinutesUsed:
          (usage['monthlyMinutesUsed'] as num?)?.toDouble() ?? 0,
      monthlyQuestionsUsed:
          (usage['monthlyQuestionsUsed'] as num?)?.toInt() ?? 0,
      remainingDailyMinutes:
          (remaining['dailyMinutes'] as num?)?.toDouble(),
      remainingMonthlyQuestions:
          (remaining['monthlyQuestions'] as num?)?.toInt(),
    );
  }

  String get shortLabel {
    final mins = remainingDailyMinutes == null
        ? 'Sınırsız'
        : '${remainingDailyMinutes!.toStringAsFixed(0)} dk kaldı';
    return mins;
  }
}
