class CanvasCommand {
  const CanvasCommand({
    required this.type,
    this.x,
    this.y,
    this.x1,
    this.y1,
    this.x2,
    this.y2,
    this.w,
    this.h,
    this.content,
    this.latex,
    this.isLatexText,
  });

  final String type;
  final double? x;
  final double? y;
  final double? x1;
  final double? y1;
  final double? x2;
  final double? y2;
  final double? w;
  final double? h;
  final String? content;
  final String? latex;
  final bool? isLatexText;

  factory CanvasCommand.fromJson(Map<String, dynamic> json) {
    return CanvasCommand(
      type: json['type'] as String? ?? 'text',
      x: (json['x'] as num?)?.toDouble(),
      y: (json['y'] as num?)?.toDouble(),
      x1: (json['x1'] as num?)?.toDouble(),
      y1: (json['y1'] as num?)?.toDouble(),
      x2: (json['x2'] as num?)?.toDouble(),
      y2: (json['y2'] as num?)?.toDouble(),
      w: (json['w'] as num?)?.toDouble(),
      h: (json['h'] as num?)?.toDouble(),
      content: json['content'] as String?,
      latex: json['latex'] as String?,
      isLatexText: json['latex'] is bool ? json['latex'] as bool : null,
    );
  }
}

class SocraticResult {
  const SocraticResult({
    required this.guidingQuestion,
    required this.latexHints,
    required this.canvasCommands,
    required this.pedagogicalBand,
    required this.tokensUsed,
  });

  final String guidingQuestion;
  final List<String> latexHints;
  final List<CanvasCommand> canvasCommands;
  final String pedagogicalBand;
  final int tokensUsed;

  factory SocraticResult.fromJson(Map<String, dynamic> json) {
    return SocraticResult(
      guidingQuestion: json['guidingQuestion'] as String? ?? '',
      latexHints: (json['latexHints'] as List<dynamic>?)
              ?.map((e) => e.toString())
              .toList() ??
          const [],
      canvasCommands: (json['canvasCommands'] as List<dynamic>?)
              ?.whereType<Map<String, dynamic>>()
              .map(CanvasCommand.fromJson)
              .toList() ??
          const [],
      pedagogicalBand: json['pedagogicalBand'] as String? ?? '',
      tokensUsed: (json['tokensUsed'] as num?)?.toInt() ?? 0,
    );
  }
}

class SocraticResponse {
  const SocraticResponse({
    required this.socratic,
    this.mistakeId,
    this.costPath = 'dynamic_gemini',
    this.subject,
    this.topic,
    this.topicMatch,
  });

  final SocraticResult socratic;
  final String? mistakeId;
  final String costPath;
  final String? subject;
  final String? topic;
  final Map<String, dynamic>? topicMatch;

  factory SocraticResponse.fromJson(Map<String, dynamic> json) {
    final mistake = json['mistake'] as Map<String, dynamic>?;
    return SocraticResponse(
      socratic: SocraticResult.fromJson(
        (json['socratic'] as Map<String, dynamic>?) ?? const {},
      ),
      mistakeId: mistake?['id'] as String?,
      costPath: json['costPath'] as String? ?? 'dynamic_gemini',
      subject: json['subject'] as String?,
      topic: json['topic'] as String?,
      topicMatch: json['topicMatch'] as Map<String, dynamic>?,
    );
  }
}
