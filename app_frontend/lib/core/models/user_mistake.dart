class QuestionData {
  const QuestionData({
    required this.prompt,
    this.studentAnswer,
    this.correctAnswerLatex,
    this.difficulty,
    this.source,
  });

  final String prompt;
  final String? studentAnswer;
  final String? correctAnswerLatex;
  final String? difficulty;
  final String? source;

  Map<String, dynamic> toJson() => {
        'prompt': prompt,
        if (studentAnswer != null) 'student_answer': studentAnswer,
        if (correctAnswerLatex != null)
          'correct_answer_latex': correctAnswerLatex,
        if (difficulty != null) 'difficulty': difficulty,
        if (source != null) 'source': source,
      };

  factory QuestionData.fromJson(Map<String, dynamic> json) {
    return QuestionData(
      prompt: json['prompt'] as String? ?? '',
      studentAnswer: json['student_answer'] as String?,
      correctAnswerLatex: json['correct_answer_latex'] as String?,
      difficulty: json['difficulty'] as String?,
      source: json['source'] as String?,
    );
  }
}

class UserMistake {
  const UserMistake({
    required this.id,
    required this.userId,
    required this.questionData,
    required this.nextReviewDate,
    required this.repetitionStage,
    required this.resolved,
    this.sessionId,
    this.subject,
    this.topic,
    this.struggleScore = 1,
    this.timesReviewed = 0,
  });

  final String id;
  final String userId;
  final QuestionData questionData;
  final DateTime nextReviewDate;
  final int repetitionStage;
  final bool resolved;
  final String? sessionId;
  final String? subject;
  final String? topic;
  final int struggleScore;
  final int timesReviewed;

  factory UserMistake.fromJson(Map<String, dynamic> json) {
    return UserMistake(
      id: json['id'] as String,
      userId: json['user_id'] as String,
      questionData: QuestionData.fromJson(
        (json['question_data'] as Map<String, dynamic>?) ?? const {},
      ),
      nextReviewDate: DateTime.parse(json['next_review_date'] as String),
      repetitionStage: (json['repetition_stage'] as num?)?.toInt() ?? 0,
      resolved: json['resolved'] as bool? ?? false,
      sessionId: json['session_id'] as String?,
      subject: json['subject'] as String?,
      topic: json['topic'] as String?,
      struggleScore: (json['struggle_score'] as num?)?.toInt() ?? 1,
      timesReviewed: (json['times_reviewed'] as num?)?.toInt() ?? 0,
    );
  }
}
