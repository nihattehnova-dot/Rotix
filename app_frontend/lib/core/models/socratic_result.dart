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
    this.delayMs,
    this.dataUrl,
    this.spoiler = false,
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
  final int? delayMs;
  final String? dataUrl;
  final bool spoiler;

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
      delayMs: (json['delayMs'] as num?)?.toInt(),
      dataUrl: json['dataUrl'] as String?,
      spoiler: json['spoiler'] == true,
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
    this.spokenNarration,
    this.neverRevealAnswer = true,
    this.sessionComplete = false,
    this.stageComplete = false,
    this.forceRevealApplied = false,
    this.interactionTurnCount,
    this.questionStage,
  });

  final String guidingQuestion;
  /** Sesli anlatım — TTS öncelikli metin */
  final String? spokenNarration;
  final List<String> latexHints;
  final List<CanvasCommand> canvasCommands;
  final String pedagogicalBand;
  final int tokensUsed;
  final bool neverRevealAnswer;
  final bool sessionComplete;
  final bool stageComplete;
  final bool forceRevealApplied;
  final int? interactionTurnCount;
  final int? questionStage;

  /// TTS için tercih edilen metin
  String get narrationText {
    final n = spokenNarration?.trim();
    if (n != null && n.isNotEmpty) return n;
    return guidingQuestion;
  }

  factory SocraticResult.fromJson(Map<String, dynamic> json) {
    return SocraticResult(
      guidingQuestion: json['guidingQuestion'] as String? ?? '',
      spokenNarration: json['spokenNarration'] as String?,
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
      neverRevealAnswer: json['neverRevealAnswer'] as bool? ?? true,
      sessionComplete: json['sessionComplete'] as bool? ?? false,
      stageComplete: json['stageComplete'] as bool? ?? false,
      forceRevealApplied: json['forceRevealApplied'] as bool? ?? false,
      interactionTurnCount: (json['interactionTurnCount'] as num?)?.toInt(),
      questionStage: (json['questionStage'] as num?)?.toInt(),
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
    this.video,
    this.interactionTurnCount,
    this.forceRevealApplied,
  });

  final SocraticResult socratic;
  final String? mistakeId;
  final String costPath;
  final String? subject;
  final String? topic;
  final Map<String, dynamic>? topicMatch;
  final Map<String, dynamic>? video;
  final int? interactionTurnCount;
  final bool? forceRevealApplied;

  factory SocraticResponse.fromJson(Map<String, dynamic> json) {
    final mistake = json['mistake'] as Map<String, dynamic>?;
    final socraticRaw =
        (json['socratic'] as Map<String, dynamic>?) ?? const {};
    return SocraticResponse(
      socratic: SocraticResult.fromJson({
        ...socraticRaw,
        'sessionComplete':
            socraticRaw['sessionComplete'] ?? json['sessionComplete'],
        'stageComplete':
            socraticRaw['stageComplete'] ?? json['stageComplete'],
        'forceRevealApplied':
            socraticRaw['forceRevealApplied'] ?? json['forceRevealApplied'],
        'interactionTurnCount': socraticRaw['interactionTurnCount'] ??
            json['interactionTurnCount'],
        'spokenNarration':
            socraticRaw['spokenNarration'] ?? json['spokenNarration'],
        'questionStage':
            socraticRaw['questionStage'] ?? json['questionStage'],
      }),
      mistakeId: mistake?['id'] as String?,
      costPath: json['costPath'] as String? ?? 'dynamic_gemini',
      subject: json['subject'] as String?,
      topic: json['topic'] as String?,
      topicMatch: json['topicMatch'] as Map<String, dynamic>?,
      video: json['video'] as Map<String, dynamic>?,
      interactionTurnCount: (json['interactionTurnCount'] as num?)?.toInt(),
      forceRevealApplied: json['forceRevealApplied'] as bool?,
    );
  }
}
