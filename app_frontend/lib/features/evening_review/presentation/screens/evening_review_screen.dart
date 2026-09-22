import 'dart:async';
import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:image_picker/image_picker.dart';
import 'package:sanal_ogretmen/core/audio/voice_listener.dart';
import 'package:sanal_ogretmen/core/audio/warm_narration.dart';
import 'package:sanal_ogretmen/core/media/webcam_capture.dart';
import 'package:sanal_ogretmen/core/media/image_compress.dart';
import 'package:sanal_ogretmen/core/theme/app_theme.dart';
import 'package:sanal_ogretmen/core/theme/grade_adaptive_theme.dart';
import 'package:sanal_ogretmen/core/theme/rotix_surfaces.dart';
import 'package:sanal_ogretmen/features/evening_review/presentation/widgets/curated_video_card.dart';
import 'package:sanal_ogretmen/features/evening_review/presentation/widgets/session_controls.dart';
import 'package:sanal_ogretmen/features/evening_review/presentation/widgets/whiteboard_canvas.dart';
import 'package:sanal_ogretmen/core/api/auth_api.dart';
import 'package:sanal_ogretmen/core/network/api_config.dart';
import 'package:sanal_ogretmen/core/providers/api_providers.dart';
import 'package:sanal_ogretmen/core/realtime/whiteboard_ws_client.dart';
import 'package:sanal_ogretmen/features/branding/presentation/widgets/roti_mascot.dart';
import 'package:sanal_ogretmen/features/evening_review/presentation/roti_session_mood.dart';
import 'package:sanal_ogretmen/features/evening_review/providers/evening_review_provider.dart';

/// Canlı tahta: soru sor · ipucu · unutma eğrisi tekrarı.
class EveningReviewScreen extends ConsumerStatefulWidget {
  const EveningReviewScreen({
    super.key,
    this.demoGradeLevel = 5,
    this.studentName = 'Öğrenci',
  });

  final int demoGradeLevel;
  final String studentName;

  @override
  ConsumerState<EveningReviewScreen> createState() =>
      _EveningReviewScreenState();
}

class _EveningReviewScreenState extends ConsumerState<EveningReviewScreen> {
  final _boardController = WhiteboardController();
  final _picker = ImagePicker();
  WhiteboardWsClient? _ws;
  String? _wsSessionId;
  VoidCallback? _clearBoardFn;
  String? _pendingPhotoBase64;
  String? _pendingPhotoMime;
  /// Hot reload sonrası undefined olmasın diye nullable + güvenli erişim
  List<String>? _photoClarifications;
  bool _voiceFinalHandled = false;

  List<String> get _clarifications => _photoClarifications ?? const [];

  static String _mapText(dynamic value, String fallback) {
    if (value == null) return fallback;
    final s = value is String ? value : value.toString();
    return s.trim().isEmpty ? fallback : s;
  }

  @override
  void initState() {
    super.initState();
    _photoClarifications = const [];
  }

  @override
  void dispose() {
    WarmNarration.instance.stop();
    VoiceListener.instance.cancel();
    _ws?.disconnect();
    super.dispose();
  }

  Future<void> _syncWs(EveningReviewState state, ApiConfig config) async {
    final session = state.activeSession;
    if (session == null) {
      await _ws?.disconnect();
      _wsSessionId = null;
      return;
    }
    if (_wsSessionId == session.id) return;

    var userId = config.userId;
    if (userId.isEmpty && config.accessToken != null) {
      try {
        final me = await AuthApi(ref.read(apiClientProvider)).me();
        userId = me['id'] as String? ?? userId;
      } catch (_) {}
    }
    if (userId.isEmpty) {
      userId = '00000000-0000-0000-0000-000000000001';
    }

    final client = WhiteboardWsClient(wsBaseUrl: config.effectiveWsBase);
    client.onRemoteStroke = (stroke) {
      _boardController.applyRemoteStroke(stroke);
    };
    client.onRemoteClear = () {
      _boardController.clearRemote();
    };
    client.onRemoteCanvas = (cmds) {
      _boardController.applyCanvasCommands(cmds);
    };
    _ws ??= client;

    try {
      final ok = await _ws!.connect(sessionId: session.id, userId: userId);
      if (ok) {
        _wsSessionId = session.id;
      } else {
        // WS yoksa da tahta + Sokratik HTTP ile devam eder
        _wsSessionId = session.id;
      }
    } catch (_) {
      _wsSessionId = session.id;
    }
  }

  void _onStrokeComplete(EveningReviewNotifier notifier) {
    notifier.markStroke();
    final session = ref.read(eveningReviewProvider(widget.demoGradeLevel)).activeSession;
    final stroke = _boardController.takeLastStroke();
    if (_ws != null && session != null && stroke != null) {
      _ws!.sendStroke(
        sessionId: session.id,
        colorHex: '#${stroke.color.value.toRadixString(16).padLeft(8, '0')}',
        width: stroke.width,
        points: stroke.points
            .map((p) => {'x': p.offset.dx, 'y': p.offset.dy})
            .toList(),
      );
    }
  }

  Future<void> _toggleMic(EveningReviewNotifier notifier) async {
    final voice = VoiceListener.instance;
    if (voice.isListening || notifier.state.isMicActive) {
      await voice.stop();
      final heard = voice.lastHeard.trim();
      notifier.setMicActive(false);
      if (heard.isNotEmpty) {
        notifier.setStatus('Seni duydum: $heard');
        await _onVoiceFinal(notifier, heard);
      } else {
        notifier.setStatus(
          voice.lastError ??
              'Seni duyamadım. Yakın konuş, tekrar mikrofona bas. Yazmak için İpucu’ya bas.',
        );
      }
      return;
    }

    await WarmNarration.instance.stop();
    final ok = await voice.ensureReady();
    if (!ok) {
      notifier.setStatus(
        voice.lastError ??
            'Mikrofon açılamadı. Chrome’da mikrofon iznini ver, sayfayı yenile (F5).',
      );
      return;
    }

    _voiceFinalHandled = false;
    notifier.setMicActive(true);
    notifier.setStatus(
      'Dinliyorum… sorunu söyle. Bitince mikrofona tekrar bas veya sus, otomatik gider.',
    );
    await voice.start(
      onResult: (text, isFinal) {
        if (!mounted) return;
        if (text.trim().isEmpty) return;
        notifier.setStatus('Seni duydum: $text');
        if (isFinal) {
          _onVoiceFinal(notifier, text.trim());
        }
      },
      onSoundLevel: (level) {
        if (!mounted) return;
        final n = ((level + 40) / 40).clamp(0.2, 0.95);
        notifier.setSpeakingLevel(n);
      },
      onStatus: (msg) {
        if (!mounted) return;
        // Teknik durumlar (listening/done) kullanıcıya basılmasın
        if (msg == 'listening' ||
            msg == 'done' ||
            msg == 'notListening' ||
            msg == 'doneNoResult') {
          if ((msg == 'done' || msg == 'notListening') &&
              !VoiceListener.instance.isListening) {
            notifier.setMicActive(false);
          }
          return;
        }
        notifier.setMicActive(false);
        notifier.setStatus(msg);
      },
    );

    if (!voice.isListening && voice.lastError != null) {
      notifier.setMicActive(false);
      notifier.setStatus(
        '${voice.lastError!} Yazmak için İpucu’ya bas.',
      );
      // Yazılı diyaloğu otomatik açma — kullanıcı ses göndermek istiyor
    }
  }

  Future<void> _pickPhotoForQuestion(EveningReviewNotifier notifier) async {
    final choice = await showModalBottomSheet<String>(
      context: context,
      backgroundColor: RotixColors.glass,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) {
        return SafeArea(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 20),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  'Fotoğrafla sor',
                  style: GoogleFonts.nunito(
                    fontWeight: FontWeight.w800,
                    fontSize: 16,
                    color: RotixColors.textPrimary,
                  ),
                ),
                const SizedBox(height: 12),
                ListTile(
                  leading: const Icon(Icons.photo_camera_rounded,
                      color: RotixColors.neon),
                  title: Text(
                    'Kamera',
                    style: GoogleFonts.nunito(
                      color: RotixColors.textPrimary,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  subtitle: Text(
                    kIsWeb
                        ? 'Canlı webcam ile çek'
                        : 'Cihaz kamerasını aç',
                    style: GoogleFonts.nunito(
                      color: RotixColors.textMuted,
                      fontSize: 12,
                    ),
                  ),
                  onTap: () => Navigator.pop(ctx, 'camera'),
                ),
                ListTile(
                  leading: const Icon(Icons.photo_library_rounded,
                      color: RotixColors.neon),
                  title: Text(
                    'Galeriden seç',
                    style: GoogleFonts.nunito(
                      color: RotixColors.textPrimary,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  onTap: () => Navigator.pop(ctx, 'gallery'),
                ),
              ],
            ),
          ),
        );
      },
    );
    if (choice == null || !mounted) return;

    if (choice == 'camera' && kIsWeb) {
      final bytes = await captureWebcamPhoto(context);
      if (bytes == null || !mounted) return;
      final compressed = await compressQuestionImage(bytes);
      _pendingPhotoBase64 = base64Encode(compressed);
      _pendingPhotoMime = 'image/png';
      _photoClarifications = const [];
      // Tahtaya hemen yerleştir
      _boardController.setStudentPhoto(
        'data:image/png;base64,${_pendingPhotoBase64!}',
      );
      await _submitPhotoQuestion(notifier);
      return;
    }

    final file = await _picker.pickImage(
      source:
          choice == 'camera' ? ImageSource.camera : ImageSource.gallery,
      maxWidth: 1024,
      maxHeight: 1024,
      imageQuality: 78,
    );
    if (file == null || !mounted) return;

    final bytes = await file.readAsBytes();
    final compressed = await compressQuestionImage(bytes);
    _pendingPhotoBase64 = base64Encode(compressed);
    _pendingPhotoMime = 'image/png';
    _photoClarifications = const [];
    _boardController.setStudentPhoto(
      'data:image/png;base64,${_pendingPhotoBase64!}',
    );
    await _submitPhotoQuestion(notifier);
  }

  Future<void> _submitPhotoQuestion(
    EveningReviewNotifier notifier, {
    int? selectedIndex,
  }) async {
    final b64 = _pendingPhotoBase64;
    if (b64 == null) return;

    notifier.setStatus('Fotoğraf okunuyor…');
    try {
      if (notifier.state.activeSession == null) {
        await notifier.startSession();
      }
      final raw = await ref.read(learningApiProvider).photoQuestion(
            imageBase64: b64,
            mimeType: _pendingPhotoMime,
            subject: null,
            sessionId: notifier.state.activeSession?.id,
            selectedQuestionIndex: selectedIndex,
          );

      if (raw['needsClarification'] == true) {
        final qs = (raw['questions'] as List<dynamic>? ?? const [])
            .map((e) => e.toString())
            .toList();
        setState(() => _photoClarifications = qs);
        notifier.setStatus(
          raw['message'] as String? ??
              'Birden fazla soru var — aşağıdan birini seç.',
        );
        return;
      }

      final socratic = ref.read(learningApiProvider).parseSocratic(raw);
      final subject = raw['subject'] as String? ?? 'Matematik';
      final topic = raw['topic'] as String? ?? 'Ödev sorusu';
      final match = raw['topicMatch'] as Map<String, dynamic>?;

      if (socratic == null) {
        _resetPhotoAttempt(
          notifier,
          'Fotoğraftan yanıt alınamadı. Yeniden deneyebilirsin.',
        );
        return;
      }

      final cmds = <Map<String, dynamic>>[
        {'type': 'clear', 'delayMs': 0},
        ...socratic.canvasCommands.map(
          (c) => {
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
            if (c.delayMs != null) 'delayMs': c.delayMs,
          },
        ),
      ];

      // Fotoğrafı state’te tut (Vision + tahta); yalnızca clarifications temizle
      setState(() {
        _photoClarifications = const [];
      });

      notifier.selectCurriculum({
        'id': match?['curriculumId'],
        'subject': subject,
        'topic': topic,
        'confidence': match?['confidence'],
      });
      final extracted = raw['extractedText'] as String? ?? topic;
      final video = raw['video'] as Map<String, dynamic>?;
      await notifier.applyExternalSocratic(
        socratic: socratic,
        subject: subject,
        topic: topic,
        canvasCommands: cmds,
        questionText: extracted,
        video: video,
      );
      if (_pendingPhotoBase64 != null) {
        _boardController.setStudentPhoto(
          'data:${_pendingPhotoMime ?? 'image/jpeg'};base64,${_pendingPhotoBase64!}',
        );
      }
      unawaited(notifier.refreshDueMistakes());
      unawaited(_speakGuidingQuestion(notifier));
    } catch (e) {
      final msg = e.toString();
      final isReadFail = msg.contains('OCR') ||
          msg.contains('okunamad') ||
          msg.contains('422') ||
          msg.contains('Fotoğraf');
      _resetPhotoAttempt(
        notifier,
        isReadFail
            ? 'Fotoğraf okunamadı — sayfa sıfırlandı. Yeniden sorabilirsin.'
            : 'Fotoğraf gönderilemedi: $e',
      );
    }
  }

  void _resetPhotoAttempt(EveningReviewNotifier notifier, String message) {
    _pendingPhotoBase64 = null;
    _pendingPhotoMime = null;
    _photoClarifications = const [];
    _boardController.clearStudentPhoto();
    _clearBoardFn?.call();
    notifier.resetQuestionUi(statusMessage: message);
    if (mounted) setState(() {});
  }

  Future<void> _onVoiceFinal(
    EveningReviewNotifier notifier,
    String text,
  ) async {
    if (_voiceFinalHandled) return;
    final trimmed = text.trim();
    if (trimmed.isEmpty) return;
    _voiceFinalHandled = true;

    try {
      await VoiceListener.instance.stop();
      notifier.setMicActive(false);

      final lower = trimmed.toLowerCase();
      final looksLikeAnswer = RegExp(r'^[\d\s.,+\-*/=xXyYa-zA-ZçğıöşüÇĞİÖŞÜ]+$')
              .hasMatch(trimmed) &&
          trimmed.length <= 40;
      final isQuestion = lower.contains('?') ||
          lower.contains('nasıl') ||
          lower.contains('nedir') ||
          lower.contains('anlamad') ||
          lower.contains('çöz') ||
          lower.contains('yardım') ||
          lower.contains('kaç') ||
          lower.contains('ne ');

      final hasActive = notifier.state.activeQuestionText != null ||
          notifier.state.guidingQuestion != null ||
          _pendingPhotoBase64 != null;

      // Kısa cevap / sayı → aktif soruya studentAnswer
      if (hasActive && (looksLikeAnswer || trimmed.length <= 24) && !isQuestion) {
        await notifier.askSocratic(
          questionText: notifier.state.activeQuestionText ??
              notifier.state.guidingQuestion ??
              'Ödev sorusu',
          studentAnswer: trimmed,
          logAsMistake: true,
          answerWrong: true,
          // görsel takipte gitmez
        );
        // Ses UI'yi kilitlemesin
        unawaited(_speakGuidingQuestion(notifier));
        return;
      }

      if (isQuestion || trimmed.length > 2) {
        await notifier.askSocratic(
          questionText: trimmed,
          logAsMistake: true,
          imageBase64: _pendingPhotoBase64,
          imageMimeType: _pendingPhotoMime,
        );
        unawaited(_speakGuidingQuestion(notifier));
        return;
      }

      notifier.setStatus('Sorunu daha net söyle veya İpucu ile yaz.');
    } finally {
      _voiceFinalHandled = false;
    }
  }

  Future<void> _speakGuidingQuestion(EveningReviewNotifier notifier) async {
    final guide = notifier.state.spokenNarration ??
        notifier.state.lastSocratic?.narrationText ??
        notifier.state.guidingQuestion;
    if (guide == null || guide.isEmpty) return;
    final config = ref.read(apiConfigProvider);
    final tts = WarmNarration.instance;
    tts.onLevel = (level) {
      if (!mounted) return;
      notifier.setSpeakingLevel(level);
    };
    tts.onDone = () {
      if (!mounted) return;
      notifier.setSpeakingLevel(0);
    };
    await tts.speakText(
      guide,
      config: config,
      ws: _ws,
      sessionId: notifier.state.activeSession?.id,
    );
  }

  Future<void> _openSocraticDialog(EveningReviewNotifier notifier) async {
    final questionCtrl = TextEditingController(
      text: '2x + 6 = 14 denkleminde x nedir?',
    );
    final answerCtrl = TextEditingController();

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) {
        return AlertDialog(
          title: const Text('Roti’ye sor'),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                TextField(
                  controller: questionCtrl,
                  decoration: const InputDecoration(
                    labelText: 'Soru / problem',
                  ),
                  maxLines: 3,
                ),
                const SizedBox(height: 8),
                TextField(
                  controller: answerCtrl,
                  decoration: const InputDecoration(
                    labelText: 'Öğrenci denemesi (opsiyonel)',
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  'Konuyu Roti kendisi bulur ve unutma defterine kaydeder.',
                  style: GoogleFonts.nunito(
                    fontSize: 12,
                    color: RotixColors.textMuted,
                  ),
                ),
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx, false),
              child: const Text('Vazgeç'),
            ),
            FilledButton(
              onPressed: () => Navigator.pop(ctx, true),
              child: const Text('Gönder'),
            ),
          ],
        );
      },
    );

    if (confirmed != true || !mounted) return;

    await notifier.askSocratic(
      questionText: questionCtrl.text.trim(),
      studentAnswer: answerCtrl.text.trim().isEmpty
          ? null
          : answerCtrl.text.trim(),
      logAsMistake: true,
      answerWrong: answerCtrl.text.trim().isNotEmpty,
      imageBase64: _pendingPhotoBase64,
      imageMimeType: _pendingPhotoMime,
    );
    await _speakGuidingQuestion(notifier);
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(eveningReviewProvider(widget.demoGradeLevel));
    final notifier =
        ref.read(eveningReviewProvider(widget.demoGradeLevel).notifier);
    final adaptive = GradeAdaptiveTheme.forGrade(state.gradeLevel);
    final apiConfig = ref.watch(apiConfigProvider);
    ref.listen(eveningReviewProvider(widget.demoGradeLevel), (prev, next) {
      _syncWs(next, apiConfig);
      if (prev?.canvasCommandSeq != next.canvasCommandSeq &&
          next.pendingCanvasCommands.isNotEmpty) {
        final cmds = List<Map<String, dynamic>>.from(
          next.pendingCanvasCommands,
        );
        _boardController.applyCanvasCommands(cmds);
        notifier.consumeCanvasCommands();
        if (_ws != null && next.activeSession != null) {
          _ws!.send({
            'type': 'canvas_commands',
            'sessionId': next.activeSession!.id,
            'commands': cmds,
          });
        }
      }
    });
    if (state.activeSession != null) {
      _syncWs(state, apiConfig);
    }

    return Scaffold(
      body: RotixBackdrop(
        child: SafeArea(
          child: Stack(
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    _Header(
                      gradeLevel: state.gradeLevel,
                      subject: _mapText(
                        state.activeCurriculum?['subject'],
                        state.lastSocratic != null ? 'Soru' : 'Canlı Tahta',
                      ),
                      topic: _mapText(
                        state.activeCurriculum?['topic'],
                        state.dueMistakes.isNotEmpty
                            ? 'Unutma tekrarı hazır'
                            : 'Konuyu Roti bulur',
                      ),
                    ),
                    if (state.dueMistakes.isNotEmpty) ...[
                      const SizedBox(height: 8),
                      GlassCard(
                        padding: const EdgeInsets.all(12),
                        child: Row(
                          children: [
                            const Icon(Icons.replay_circle_filled_rounded,
                                color: RotixColors.timeBadge, size: 22),
                            const SizedBox(width: 10),
                            Expanded(
                              child: Text(
                                'Bugün ${state.dueMistakes.length} unutma eğrisi tekrarın var — alttan seç.',
                                style: GoogleFonts.nunito(
                                  fontSize: 13,
                                  fontWeight: FontWeight.w700,
                                  color: RotixColors.textPrimary,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                    if (state.guidingQuestion != null) ...[
                      const SizedBox(height: 8),
                      GlassCard(
                        padding: const EdgeInsets.all(12),
                        child: Text(
                          state.guidingQuestion!,
                          style: GoogleFonts.nunito(
                            fontSize: 14,
                            fontWeight: FontWeight.w700,
                            color: RotixColors.textPrimary,
                          ),
                        ),
                      ),
                    ],
                    if (state.videoSuggestion != null) ...[
                      CuratedVideoCard(
                        video: VideoSuggestion.fromJson(state.videoSuggestion!),
                      ),
                    ],
                    if (_clarifications.isNotEmpty) ...[
                      const SizedBox(height: 8),
                      SizedBox(
                        height: 88,
                        child: ListView.separated(
                          itemCount: _clarifications.length,
                          separatorBuilder: (_, __) =>
                              const SizedBox(height: 6),
                          itemBuilder: (context, i) {
                            return Material(
                              color: RotixColors.glass.withOpacity(0.55),
                              borderRadius: BorderRadius.circular(12),
                              child: InkWell(
                                borderRadius: BorderRadius.circular(12),
                                onTap: () => _submitPhotoQuestion(
                                  notifier,
                                  selectedIndex: i,
                                ),
                                child: Padding(
                                  padding: const EdgeInsets.symmetric(
                                    horizontal: 12,
                                    vertical: 10,
                                  ),
                                  child: Text(
                                    '${i + 1}. ${_clarifications[i]}',
                                    maxLines: 2,
                                    overflow: TextOverflow.ellipsis,
                                    style: GoogleFonts.nunito(
                                      fontSize: 13,
                                      fontWeight: FontWeight.w700,
                                      color: RotixColors.textPrimary,
                                    ),
                                  ),
                                ),
                              ),
                            );
                          },
                        ),
                      ),
                    ],
                    const SizedBox(height: 10),
                    Expanded(
                      flex: state.boardExpanded ? 8 : 5,
                      child: Stack(
                        children: [
                          _WhiteboardPanel(
                            accent: RotixColors.neon,
                            controller: _boardController,
                            onStrokeComplete: () =>
                                _onStrokeComplete(notifier),
                            onClearReady: (clear) => _clearBoardFn = clear,
                            latexHints:
                                state.lastSocratic?.latexHints ?? const [],
                          ),
                          Positioned(
                            top: 8,
                            right: 8,
                            child: IconButton.filled(
                              style: IconButton.styleFrom(
                                backgroundColor: Colors.black54,
                              ),
                              tooltip: state.boardExpanded
                                  ? 'Tahtayı küçült'
                                  : 'Tahtayı büyüt',
                              onPressed: notifier.toggleBoardExpanded,
                              icon: Icon(
                                state.boardExpanded
                                    ? Icons.fullscreen_exit_rounded
                                    : Icons.fullscreen_rounded,
                                color: Colors.white,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 8),
                    if (_userFacingStatus(state) != null)
                      Padding(
                        padding: const EdgeInsets.only(bottom: 6),
                        child: Text(
                          _userFacingStatus(state)!,
                          textAlign: TextAlign.center,
                          style: GoogleFonts.nunito(
                            fontSize: 13,
                            fontWeight: FontWeight.w600,
                            color: state.errorMessage != null
                                ? RotixColors.streak
                                : RotixColors.textMuted,
                          ),
                        ),
                      ),
                    SessionControls(
                      state: state,
                      theme: adaptive,
                      onToggleMic: () => _toggleMic(notifier),
                      onClearBoard: () {
                        WarmNarration.instance.stop();
                        VoiceListener.instance.stop();
                        _clearBoardFn?.call();
                        notifier.clearBoard();
                        notifier.setMicActive(false);
                        final session = state.activeSession;
                        if (_ws != null && session != null) {
                          _ws!.sendClear(session.id);
                        }
                      },
                      onAskSocratic: () => _openSocraticDialog(notifier),
                      onPhotoTap: () => _pickPhotoForQuestion(notifier),
                      onDueMistakeTap: (m) async {
                        await notifier.startDueReview(m);
                        await _speakGuidingQuestion(notifier);
                      },
                    ),
                  ],
                ),
              ),
              Positioned(
                right: 8,
                bottom: 168,
                child: RotiMascot(
                  mood: rotiMoodFromSession(state),
                  size: 96,
                  showBubble: true,
                  customMessage: state.guidingQuestion ??
                      (state.isMicActive
                          ? 'Seni dinliyorum — bitince mikrofona tekrar bas'
                          : state.dueMistakes.isNotEmpty
                              ? 'Unutma tekrarını seçebilirsin'
                              : 'Konuş, yaz veya fotoğrafla sor'),
                  floating: true,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  String? _userFacingStatus(EveningReviewState state) {
    if (state.errorMessage != null) return state.errorMessage;
    final s = state.statusMessage;
    if (s == null) return null;
    // Teknik / geliştirici ifadelerini gizle
    final lower = s.toLowerCase();
    if (lower.contains('api') ||
        lower.contains('gemini') ||
        lower.contains('önbellek') ||
        lower.contains('ws') ||
        lower.contains('kota alınamadı') ||
        lower.contains('oturum:') ||
        lower.contains('basic') ||
        lower.contains('mode')) {
      if (lower.contains('dinliyorum') || lower.contains('duydum')) return s;
      if (lower.contains('roti')) return s;
      return null;
    }
    return s;
  }
}

class _Header extends StatelessWidget {
  const _Header({
    required this.gradeLevel,
    required this.subject,
    required this.topic,
  });

  final int gradeLevel;
  final String subject;
  final String topic;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        GlassPill(
          onTap: () => context.go('/app'),
          child: const Icon(
            Icons.arrow_back_ios_new_rounded,
            size: 16,
            color: RotixColors.textPrimary,
          ),
        ),
        const SizedBox(width: 10),
        Expanded(
          child: Text(
            'Soru Çöz · $subject · $topic ($gradeLevel. Sınıf)',
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
            style: GoogleFonts.nunito(
              fontSize: 15,
              fontWeight: FontWeight.w800,
              color: RotixColors.textPrimary,
              height: 1.25,
            ),
          ),
        ),
      ],
    );
  }
}

class _WhiteboardPanel extends StatelessWidget {
  const _WhiteboardPanel({
    required this.accent,
    required this.controller,
    required this.onStrokeComplete,
    required this.onClearReady,
    required this.latexHints,
  });

  final Color accent;
  final WhiteboardController controller;
  final VoidCallback onStrokeComplete;
  final ValueChanged<VoidCallback> onClearReady;
  final List<String> latexHints;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(24),
        border: Border.all(
          color: RotixColors.neon.withOpacity(0.55),
          width: 2,
        ),
        boxShadow: [
          ...neonGlow(blur: 36, spread: 1),
          BoxShadow(
            color: RotixColors.neonSoft.withOpacity(0.35),
            blurRadius: 48,
            spreadRadius: 2,
          ),
        ],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(22),
        child: ColoredBox(
          color: Colors.white,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              if (latexHints.isNotEmpty)
                Padding(
                  padding: const EdgeInsets.fromLTRB(14, 10, 14, 0),
                  child: Text(
                    latexHints.join(' · '),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: GoogleFonts.nunito(
                      fontSize: 12,
                      color: RotixColors.bgDeep.withOpacity(0.55),
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              Expanded(
                child: WhiteboardCanvas(
                  strokeColor: accent,
                  controller: controller,
                  onStrokeComplete: onStrokeComplete,
                  onClearReady: onClearReady,
                  readOnly: true,
                  showGrid: false,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

