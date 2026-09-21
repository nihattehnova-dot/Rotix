import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:sanal_ogretmen/core/curriculum/curriculum_catalog.dart';
import 'package:sanal_ogretmen/core/api/ai_api.dart';
import 'package:sanal_ogretmen/core/api/learning_api.dart';
import 'package:sanal_ogretmen/core/api/mistakes_api.dart';
import 'package:sanal_ogretmen/core/api/quotas_api.dart';
import 'package:sanal_ogretmen/core/api/sessions_api.dart';
import 'package:sanal_ogretmen/core/models/quota_snapshot.dart';
import 'package:sanal_ogretmen/core/models/socratic_result.dart';
import 'package:sanal_ogretmen/core/models/tutor_session.dart';
import 'package:sanal_ogretmen/core/models/user_mistake.dart';
import 'package:sanal_ogretmen/core/network/api_exception.dart';
import 'package:sanal_ogretmen/core/providers/api_providers.dart';

enum SessionPhase {
  idle,
  listening,
  tutorSpeaking,
  drawing,
  socratic,
  busy,
  error,
}

class EveningReviewState {
  const EveningReviewState({
    this.gradeLevel = 5,
    this.phase = SessionPhase.idle,
    this.isMicActive = false,
    this.audioLevel = 0.0,
    this.strokeCount = 0,
    this.noNewTopicToday = false,
    this.activeSession,
    this.quota,
    this.dueMistakes = const [],
    this.lastSocratic,
    this.guidingQuestion,
    this.statusMessage,
    this.errorMessage,
    this.isOnlineAction = false,
    this.curriculumItems = const [],
    this.activeCurriculum,
    this.pendingCanvasCommands = const [],
    this.canvasCommandSeq = 0,
    this.videoSuggestion,
    this.boardExpanded = false,
    this.activeQuestionText,
  });

  final int gradeLevel;
  final SessionPhase phase;
  final bool isMicActive;
  final double audioLevel;
  final int strokeCount;
  final bool noNewTopicToday;
  final TutorSession? activeSession;
  final QuotaSnapshot? quota;
  final List<UserMistake> dueMistakes;
  final SocraticResult? lastSocratic;
  final String? guidingQuestion;
  final String? statusMessage;
  final String? errorMessage;
  final bool isOnlineAction;
  final List<Map<String, dynamic>> curriculumItems;
  final Map<String, dynamic>? activeCurriculum;
  final List<Map<String, dynamic>> pendingCanvasCommands;
  final int canvasCommandSeq;
  final Map<String, dynamic>? videoSuggestion;
  final bool boardExpanded;
  /** Aktif problem metni — kısa cevaplar buna studentAnswer olarak gider */
  final String? activeQuestionText;

  EveningReviewState copyWith({
    int? gradeLevel,
    SessionPhase? phase,
    bool? isMicActive,
    double? audioLevel,
    int? strokeCount,
    bool? noNewTopicToday,
    TutorSession? activeSession,
    bool clearSession = false,
    QuotaSnapshot? quota,
    List<UserMistake>? dueMistakes,
    SocraticResult? lastSocratic,
    String? guidingQuestion,
    bool clearGuiding = false,
    String? statusMessage,
    bool clearStatus = false,
    String? errorMessage,
    bool clearError = false,
    bool? isOnlineAction,
    List<Map<String, dynamic>>? curriculumItems,
    Map<String, dynamic>? activeCurriculum,
    bool clearCurriculum = false,
    List<Map<String, dynamic>>? pendingCanvasCommands,
    int? canvasCommandSeq,
    Map<String, dynamic>? videoSuggestion,
    bool clearVideo = false,
    bool? boardExpanded,
    String? activeQuestionText,
    bool clearActiveQuestion = false,
  }) {
    return EveningReviewState(
      gradeLevel: gradeLevel ?? this.gradeLevel,
      phase: phase ?? this.phase,
      isMicActive: isMicActive ?? this.isMicActive,
      audioLevel: audioLevel ?? this.audioLevel,
      strokeCount: strokeCount ?? this.strokeCount,
      noNewTopicToday: noNewTopicToday ?? this.noNewTopicToday,
      activeSession:
          clearSession ? null : (activeSession ?? this.activeSession),
      quota: quota ?? this.quota,
      dueMistakes: dueMistakes ?? this.dueMistakes,
      lastSocratic: lastSocratic ?? this.lastSocratic,
      guidingQuestion:
          clearGuiding ? null : (guidingQuestion ?? this.guidingQuestion),
      statusMessage:
          clearStatus ? null : (statusMessage ?? this.statusMessage),
      errorMessage: clearError ? null : (errorMessage ?? this.errorMessage),
      isOnlineAction: isOnlineAction ?? this.isOnlineAction,
      curriculumItems: curriculumItems ?? this.curriculumItems,
      activeCurriculum: clearCurriculum
          ? null
          : (activeCurriculum ?? this.activeCurriculum),
      pendingCanvasCommands:
          pendingCanvasCommands ?? this.pendingCanvasCommands,
      canvasCommandSeq: canvasCommandSeq ?? this.canvasCommandSeq,
      videoSuggestion:
          clearVideo ? null : (videoSuggestion ?? this.videoSuggestion),
      boardExpanded: boardExpanded ?? this.boardExpanded,
      activeQuestionText: clearActiveQuestion
          ? null
          : (activeQuestionText ?? this.activeQuestionText),
    );
  }
}

class EveningReviewNotifier extends StateNotifier<EveningReviewState> {
  EveningReviewNotifier({
    required SessionsApi sessionsApi,
    required MistakesApi mistakesApi,
    required QuotasApi quotasApi,
    required AiApi aiApi,
    required LearningApi learningApi,
    int gradeLevel = 5,
  })  : _sessionsApi = sessionsApi,
        _mistakesApi = mistakesApi,
        _quotasApi = quotasApi,
        _aiApi = aiApi,
        _learningApi = learningApi,
        super(EveningReviewState(gradeLevel: gradeLevel));

  final SessionsApi _sessionsApi;
  final MistakesApi _mistakesApi;
  final QuotasApi _quotasApi;
  final AiApi _aiApi;
  final LearningApi _learningApi;

  Future<void> bootstrap() async {
    await Future.wait([
      refreshQuota(),
      refreshDueMistakes(),
    ]);
  }

  Future<void> loadCurriculum() async {
    try {
      final items = await _learningApi.curriculum(grade: state.gradeLevel);
      if (items.isNotEmpty) {
        state = state.copyWith(curriculumItems: items);
        return;
      }
    } catch (_) {}
    // Offline fallback: bundled MEB/ÖSYM flat index
    await CurriculumCatalog.instance.ensureLoaded();
    final local = CurriculumCatalog.instance.forGrade(state.gradeLevel);
    state = state.copyWith(curriculumItems: local);
  }

  Future<void> refreshQuota() async {
    try {
      final quota = await _quotasApi.me();
      state = state.copyWith(quota: quota, clearError: true);
    } on ApiException catch (e) {
      state = state.copyWith(
        statusMessage: 'Kota alınamadı (çevrimdışı/demo): ${e.message}',
      );
    } catch (_) {
      state = state.copyWith(
        statusMessage: 'API’ye bağlanılamadı — yerel demo modu',
      );
    }
  }

  Future<void> refreshDueMistakes() async {
    try {
      final due = await _mistakesApi.due();
      state = state.copyWith(dueMistakes: due);
    } on ApiException {
    } catch (_) {}
  }

  void setGrade(int grade) {
    if (grade < 1 || grade > 12) return;
    state = state.copyWith(gradeLevel: grade);
  }

  void toggleMic() {
    final next = !state.isMicActive;
    state = state.copyWith(
      isMicActive: next,
      phase: next ? SessionPhase.listening : SessionPhase.idle,
      audioLevel: next ? 0.35 : 0.0,
    );
  }

  void setStatus(String message) {
    state = state.copyWith(statusMessage: message, clearError: true);
  }

  void setMicActive(bool active) {
    state = state.copyWith(
      isMicActive: active,
      phase: active ? SessionPhase.listening : SessionPhase.idle,
      audioLevel: active ? 0.35 : 0.0,
    );
  }

  void markStroke() {
    state = state.copyWith(
      strokeCount: state.strokeCount + 1,
      phase: SessionPhase.drawing,
    );
  }

  void clearBoard() {
    state = state.copyWith(strokeCount: 0);
  }

  Future<void> toggleNoNewTopic() async {
    final gapFill = !state.noNewTopicToday;
    state = state.copyWith(
      noNewTopicToday: gapFill,
      phase: gapFill ? SessionPhase.socratic : SessionPhase.idle,
    );
    if (gapFill) {
      await refreshDueMistakes();
      if (state.activeSession == null) {
        await startSession(forceGapFill: true);
      }
    }
  }

  void selectCurriculum(Map<String, dynamic> item) {
    state = state.copyWith(activeCurriculum: item);
  }

  /// Fotoğraf / harici Sokratik sonuç — tekrar API çağrısı yapmadan tahtaya bas.
  Future<void> applyExternalSocratic({
    required SocraticResult socratic,
    required String subject,
    required String topic,
    required List<Map<String, dynamic>> canvasCommands,
    String? questionText,
    Map<String, dynamic>? video,
  }) async {
    state = state.copyWith(
      phase: SessionPhase.socratic,
      lastSocratic: socratic,
      guidingQuestion: socratic.guidingQuestion,
      pendingCanvasCommands: canvasCommands,
      canvasCommandSeq: state.canvasCommandSeq + 1,
      activeQuestionText: questionText ?? topic,
      videoSuggestion: video,
      clearVideo: video == null,
      activeCurriculum: {
        ...?state.activeCurriculum,
        'subject': subject,
        'topic': topic,
      },
      statusMessage: 'Konu: $topic · yönlendirme hazır',
      clearError: true,
    );
  }

  Future<void> startDueReview(UserMistake mistake) async {
    await askSocratic(
      subject: mistake.subject ?? 'Matematik',
      topic: mistake.topic ?? 'Unutma tekrarı',
      questionText: mistake.questionData.prompt,
      studentAnswer: mistake.questionData.studentAnswer,
      logAsMistake: false,
    );
  }

  void setSpeakingLevel(double level) {
    state = state.copyWith(
      audioLevel: level,
      phase: level > 0.05 ? SessionPhase.tutorSpeaking : SessionPhase.idle,
    );
  }

  void consumeCanvasCommands() {
    state = state.copyWith(pendingCanvasCommands: const []);
  }

  void toggleBoardExpanded() {
    state = state.copyWith(boardExpanded: !state.boardExpanded);
  }

  void setVideoSuggestion(Map<String, dynamic>? video) {
    state = state.copyWith(
      videoSuggestion: video,
      clearVideo: video == null,
    );
  }

  Future<void> startSession({bool forceGapFill = false}) async {
    if (state.activeSession != null || state.isOnlineAction) return;

    state = state.copyWith(
      isOnlineAction: true,
      phase: SessionPhase.busy,
      clearError: true,
      statusMessage: 'Oturum başlatılıyor…',
    );

    try {
      final session = await _sessionsApi.start(
        mode: forceGapFill || state.noNewTopicToday
            ? 'gap_fill'
            : 'evening_review',
        hadNewSchoolTopic:
            forceGapFill || state.noNewTopicToday ? false : true,
      );
      state = state.copyWith(
        activeSession: session,
        phase: state.noNewTopicToday
            ? SessionPhase.socratic
            : SessionPhase.idle,
        isOnlineAction: false,
        statusMessage: 'Oturum açık · ${session.mode}',
      );
      await refreshQuota();
    } on ApiException catch (e) {
      state = state.copyWith(
        isOnlineAction: false,
        phase: SessionPhase.error,
        errorMessage: e.message,
        clearStatus: true,
      );
    } catch (e) {
      state = state.copyWith(
        isOnlineAction: false,
        phase: SessionPhase.error,
        errorMessage: 'Oturum başlatılamadı: $e',
        clearStatus: true,
      );
    }
  }

  Future<void> endSession() async {
    final session = state.activeSession;
    if (session == null || state.isOnlineAction) return;

    state = state.copyWith(
      isOnlineAction: true,
      phase: SessionPhase.busy,
      statusMessage: 'Oturum kapatılıyor…',
      clearError: true,
    );

    try {
      final ended = await _sessionsApi.end(session.id);
      state = state.copyWith(
        clearSession: true,
        isOnlineAction: false,
        phase: SessionPhase.idle,
        statusMessage:
            'Oturum bitti · +${ended.pointsEarned} puan · streak güncellendi',
        audioLevel: 0,
        isMicActive: false,
      );
      await refreshQuota();
    } on ApiException catch (e) {
      state = state.copyWith(
        isOnlineAction: false,
        phase: SessionPhase.error,
        errorMessage: e.message,
      );
    } catch (e) {
      state = state.copyWith(
        isOnlineAction: false,
        phase: SessionPhase.error,
        errorMessage: 'Oturum bitirilemedi: $e',
      );
    }
  }

  Future<void> askSocratic({
    String subject = 'Genel',
    required String questionText,
    String? studentAnswer,
    String? topic,
    bool logAsMistake = true,
    bool? answerWrong,
    String? imageBase64,
    String? imageMimeType,
  }) async {
    if (state.isOnlineAction) return;

    state = state.copyWith(
      isOnlineAction: true,
      phase: SessionPhase.busy,
      statusMessage: 'Roti düşünüyor…',
      clearError: true,
      clearGuiding: true,
    );

    try {
      if (state.activeSession == null) {
        final session = await _sessionsApi.start(
          mode: 'socratic',
          hadNewSchoolTopic: !state.noNewTopicToday,
        );
        state = state.copyWith(activeSession: session);
      }

      // Takip: kısa cevap → studentAnswer; görseli tekrar yollama
      final isFollowUp = studentAnswer != null &&
          studentAnswer.trim().isNotEmpty &&
          state.activeQuestionText != null;
      final qText = isFollowUp ? state.activeQuestionText! : questionText;
      final img = isFollowUp ? null : imageBase64;
      final mime = isFollowUp ? null : imageMimeType;

      final response = await _aiApi
          .socratic(
            subject: subject,
            questionText: qText,
            studentAnswer: studentAnswer,
            topic: topic,
            sessionId: state.activeSession?.id,
            logAsMistake: logAsMistake,
            struggleScore: logAsMistake ? 3 : null,
            answerWrong: answerWrong ??
                (studentAnswer != null && studentAnswer.trim().isNotEmpty
                    ? true
                    : null),
            imageBase64: img,
            imageMimeType: mime,
          )
          .timeout(const Duration(seconds: 45));

      final cmds = response.socratic.canvasCommands
          .map((c) => {
                'type': c.type,
                if (c.x != null) 'x': c.x,
                if (c.y != null) 'y': c.y,
                if (c.x1 != null) 'x1': c.x1,
                if (c.y1 != null) 'y1': c.y1,
                if (c.x2 != null) 'x2': c.x2,
                if (c.y2 != null) 'y2': c.y2,
                if (c.w != null) 'w': c.w,
                if (c.h != null) 'h': c.h,
                if (c.content != null) 'content': c.content,
                if (c.latex != null) 'latex': c.latex,
                // Hız: varsayılan gecikmeyi kısalt
                'delayMs': c.delayMs ?? 120,
                if (c.dataUrl != null) 'dataUrl': c.dataUrl,
              })
          .toList();

      final matchedSubject = response.subject ?? subject;
      final matchedTopic = response.topic ?? topic;
      final match = response.topicMatch;

      state = state.copyWith(
        isOnlineAction: false,
        phase: SessionPhase.socratic,
        lastSocratic: response.socratic,
        guidingQuestion: response.socratic.guidingQuestion,
        audioLevel: 0.45,
        pendingCanvasCommands: cmds,
        canvasCommandSeq: state.canvasCommandSeq + 1,
        videoSuggestion: response.video,
        clearVideo: response.video == null,
        activeQuestionText: isFollowUp ? state.activeQuestionText : qText,
        activeCurriculum: {
          'id': match?['curriculumId'] ?? state.activeCurriculum?['id'],
          'subject': matchedSubject,
          'topic': matchedTopic,
          'confidence': match?['confidence'],
          'unit_name': match?['unitName'],
          'outcome_codes': match?['outcomeCodes'],
        },
        statusMessage: response.costPath == 'semantic_cache'
            ? 'Konu: $matchedTopic · önbellek'
            : 'Konu: $matchedTopic · hazır',
      );
      // Kota yenilemeyi arka planda — UI kilitleme
      unawaited(refreshQuota());
      if (logAsMistake) unawaited(refreshDueMistakes());
    } on ApiException catch (e) {
      state = state.copyWith(
        isOnlineAction: false,
        phase: SessionPhase.error,
        errorMessage: e.isQuota ? 'Kota: ${e.message}' : e.message,
        clearStatus: true,
      );
    } catch (e) {
      state = state.copyWith(
        isOnlineAction: false,
        phase: SessionPhase.error,
        errorMessage: 'İstek başarısız: $e',
        clearStatus: true,
      );
    }
  }

  Future<void> reviewDueMistake(
    UserMistake mistake, {
    required bool mastered,
  }) async {
    if (state.isOnlineAction) return;
    state = state.copyWith(isOnlineAction: true, clearError: true);
    try {
      await _mistakesApi.review(mistake.id, mastered: mastered);
      await refreshDueMistakes();
      state = state.copyWith(
        isOnlineAction: false,
        statusMessage: mastered
            ? 'Tekrar başarılı — SR aşaması ilerledi'
            : 'Tekrar başarısız — stage 0’a döndü',
      );
    } on ApiException catch (e) {
      state = state.copyWith(
        isOnlineAction: false,
        errorMessage: e.message,
      );
    }
  }
}

final eveningReviewProvider = StateNotifierProvider.family<
    EveningReviewNotifier, EveningReviewState, int>(
  (ref, grade) {
    final notifier = EveningReviewNotifier(
      sessionsApi: ref.watch(sessionsApiProvider),
      mistakesApi: ref.watch(mistakesApiProvider),
      quotasApi: ref.watch(quotasApiProvider),
      aiApi: ref.watch(aiApiProvider),
      learningApi: ref.watch(learningApiProvider),
      gradeLevel: grade,
    );
    Future.microtask(notifier.bootstrap);
    return notifier;
  },
);
