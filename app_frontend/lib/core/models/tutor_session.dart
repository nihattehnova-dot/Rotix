class TutorSession {
  const TutorSession({
    required this.id,
    required this.userId,
    required this.mode,
    required this.startTime,
    this.endTime,
    this.topicsCovered = const [],
    this.tokensUsed = 0,
    this.hadNewSchoolTopic,
    this.successRate,
    this.pointsEarned = 0,
  });

  final String id;
  final String userId;
  final String mode;
  final DateTime startTime;
  final DateTime? endTime;
  final List<String> topicsCovered;
  final int tokensUsed;
  final bool? hadNewSchoolTopic;
  final double? successRate;
  final int pointsEarned;

  bool get isActive => endTime == null;

  factory TutorSession.fromJson(Map<String, dynamic> json) {
    return TutorSession(
      id: json['id'] as String,
      userId: json['user_id'] as String,
      mode: json['mode'] as String? ?? 'evening_review',
      startTime: DateTime.parse(json['start_time'] as String),
      endTime: json['end_time'] != null
          ? DateTime.parse(json['end_time'] as String)
          : null,
      topicsCovered: (json['topics_covered'] as List<dynamic>?)
              ?.map((e) => e.toString())
              .toList() ??
          const [],
      tokensUsed: (json['tokens_used'] as num?)?.toInt() ?? 0,
      hadNewSchoolTopic: json['had_new_school_topic'] as bool?,
      successRate: (json['success_rate'] as num?)?.toDouble(),
      pointsEarned: (json['points_earned'] as num?)?.toInt() ?? 0,
    );
  }
}
