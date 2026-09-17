import 'package:sanal_ogretmen/core/models/socratic_result.dart';
import 'package:sanal_ogretmen/core/network/api_client.dart';

class AccessInfo {
  const AccessInfo({
    required this.allowed,
    required this.status,
    this.trialEndsAt,
    required this.tier,
    this.examTrack,
  });

  final bool allowed;
  final String status;
  final DateTime? trialEndsAt;
  final String tier;
  final String? examTrack;

  factory AccessInfo.fromJson(Map<String, dynamic> json) {
    return AccessInfo(
      allowed: json['allowed'] as bool? ?? false,
      status: json['status'] as String? ?? 'trialing',
      trialEndsAt: json['trialEndsAt'] != null
          ? DateTime.tryParse(json['trialEndsAt'] as String)
          : null,
      tier: json['tier'] as String? ?? 'basic',
      examTrack: json['examTrack'] as String?,
    );
  }

  int? get trialDaysLeft {
    if (trialEndsAt == null) return null;
    final diff = trialEndsAt!.toUtc().difference(DateTime.now().toUtc()).inDays;
    return diff < 0 ? 0 : diff;
  }
}

class StudyPlan {
  const StudyPlan({
    required this.id,
    required this.planDate,
    required this.items,
    required this.generatedBy,
  });

  final String id;
  final String planDate;
  final List<StudyPlanItem> items;
  final String generatedBy;

  factory StudyPlan.fromJson(Map<String, dynamic> json) {
    final raw = json['items'] as List<dynamic>? ?? const [];
    return StudyPlan(
      id: json['id'] as String,
      planDate: json['plan_date'] as String? ?? '',
      generatedBy: json['generated_by'] as String? ?? 'rules',
      items: raw
          .whereType<Map<String, dynamic>>()
          .map(StudyPlanItem.fromJson)
          .toList(),
    );
  }
}

class StudyPlanItem {
  const StudyPlanItem({
    required this.subject,
    required this.topic,
    required this.minutes,
    required this.source,
    required this.done,
  });

  final String subject;
  final String topic;
  final int minutes;
  final String source;
  final bool done;

  factory StudyPlanItem.fromJson(Map<String, dynamic> json) {
    return StudyPlanItem(
      subject: json['subject'] as String? ?? '',
      topic: json['topic'] as String? ?? '',
      minutes: (json['minutes'] as num?)?.toInt() ?? 0,
      source: json['source'] as String? ?? 'review',
      done: json['done'] as bool? ?? false,
    );
  }
}

class LearningApi {
  LearningApi(this._client);

  final ApiClient _client;

  Future<AccessInfo> access() async {
    final json = await _client.get('/api/learning/access');
    return AccessInfo.fromJson(json['access'] as Map<String, dynamic>);
  }

  Future<StudyPlan> todayPlan() async {
    final json = await _client.get('/api/learning/plan/today');
    return StudyPlan.fromJson(json['plan'] as Map<String, dynamic>);
  }

  Future<StudyPlan> generatePlan() async {
    final json = await _client.post('/api/learning/plan/generate');
    return StudyPlan.fromJson(json['plan'] as Map<String, dynamic>);
  }

  Future<List<Map<String, dynamic>>> weakTopics() async {
    final json = await _client.get('/api/learning/mastery/weak');
    return (json['topics'] as List<dynamic>? ?? const [])
        .whereType<Map<String, dynamic>>()
        .toList();
  }

  Future<Map<String, dynamic>> checkin({
    bool? hadNewSchoolTopic,
    int? mood,
  }) async {
    final json = await _client.post('/api/learning/checkin', body: {
      if (hadNewSchoolTopic != null) 'hadNewSchoolTopic': hadNewSchoolTopic,
      if (mood != null) 'mood': mood,
    });
    return json['checkin'] as Map<String, dynamic>;
  }

  Future<List<Map<String, dynamic>>> curriculum({
    required int grade,
    String? subject,
    String? exam,
  }) async {
    final json = await _client.get('/api/learning/curriculum', query: {
      if (exam != null) 'exam': exam,
      if (exam == null) 'grade': '$grade',
      if (subject != null) 'subject': subject,
    });
    return (json['items'] as List<dynamic>? ?? const [])
        .whereType<Map<String, dynamic>>()
        .toList();
  }

  Future<List<String>> curriculumSubjects({
    int? grade,
    String? exam,
  }) async {
    final json = await _client.get('/api/learning/curriculum/subjects', query: {
      if (exam != null) 'exam': exam,
      if (grade != null) 'grade': '$grade',
    });
    return (json['subjects'] as List<dynamic>? ?? const [])
        .whereType<String>()
        .toList();
  }

  Future<Map<String, dynamic>?> microQuiz(String curriculumId) async {
    final json = await _client.get('/api/learning/micro-quiz/$curriculumId');
    final quiz = json['quiz'];
    if (quiz is Map<String, dynamic>) return quiz;
    return null;
  }

  Future<Map<String, dynamic>> submitMicroQuiz({
    required String quizId,
    required List<int> answers,
    required String subject,
    required String topic,
    String? sessionId,
  }) async {
    return _client.post('/api/learning/micro-quiz/$quizId/submit', body: {
      'answers': answers,
      'subject': subject,
      'topic': topic,
      if (sessionId != null) 'sessionId': sessionId,
    });
  }

  Future<Map<String, dynamic>> photoQuestion({
    required String imageBase64,
    String? subject,
    String? sessionId,
    String? mimeType,
    int? selectedQuestionIndex,
  }) async {
    return _client.post('/api/learning/photo-question', body: {
      'imageBase64': imageBase64,
      if (mimeType != null) 'mimeType': mimeType,
      if (subject != null) 'subject': subject,
      if (sessionId != null) 'sessionId': sessionId,
      if (selectedQuestionIndex != null)
        'selectedQuestionIndex': selectedQuestionIndex,
    });
  }

  Future<Map<String, dynamic>> parentDashboard() async {
    return _client.get('/api/learning/parent/dashboard');
  }

  SocraticResult? parseSocratic(Map<String, dynamic> photoResponse) {
    final raw = photoResponse['socratic'];
    if (raw is Map<String, dynamic>) {
      return SocraticResult.fromJson(raw);
    }
    return null;
  }
}
