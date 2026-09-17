import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:image_picker/image_picker.dart';
import 'package:sanal_ogretmen/core/audio/voice_listener.dart';
import 'package:sanal_ogretmen/core/audio/warm_narration.dart';
import 'package:sanal_ogretmen/core/branding/roti_mood.dart';
import 'package:sanal_ogretmen/core/models/socratic_result.dart';
import 'package:sanal_ogretmen/core/providers/api_providers.dart';
import 'package:sanal_ogretmen/core/theme/app_theme.dart';
import 'package:sanal_ogretmen/features/branding/presentation/widgets/brand_scaffold.dart';
import 'package:sanal_ogretmen/features/evening_review/presentation/widgets/whiteboard_canvas.dart';

/// Ödev desteği — yazı / foto; her seferinde tek soru; soru kotası.
class HomeworkSupportScreen extends ConsumerStatefulWidget {
  const HomeworkSupportScreen({super.key});

  @override
  ConsumerState<HomeworkSupportScreen> createState() =>
      _HomeworkSupportScreenState();
}

class _HomeworkSupportScreenState extends ConsumerState<HomeworkSupportScreen> {
  final _questionCtrl = TextEditingController();
  final _board = WhiteboardController();
  final _picker = ImagePicker();

  String? _pendingImageBase64;
  String? _pendingMime;
  List<String> _clarificationQuestions = const [];
  bool busy = false;
  String? status;

  @override
  void dispose() {
    _questionCtrl.dispose();
    WarmNarration.instance.stop();
    super.dispose();
  }

  void _applyTutorResult(SocraticResult result) {
    final cmds = <Map<String, dynamic>>[
      {'type': 'clear'},
      ...result.canvasCommands.map(
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
        },
      ),
    ];
    _board.applyCanvasCommands(cmds);
  }

  Future<void> _speak(String text) async {
    setState(() => status = text);
    await WarmNarration.instance.speakText(
      text,
      config: ref.read(apiConfigProvider),
    );
  }

  Future<void> _askText() async {
    final q = _questionCtrl.text.trim();
    if (q.isEmpty) {
      setState(() => status = 'Bir soru yaz veya fotoğraf çek.');
      return;
    }
    setState(() {
      busy = true;
      status = 'Roti bakıyor…';
      _clarificationQuestions = const [];
    });
    try {
      final result = await ref.read(aiApiProvider).socratic(
            subject: 'Matematik',
            topic: 'Ödev sorusu',
            questionText: q,
          );
      _applyTutorResult(result.socratic);
      await _speak(result.socratic.guidingQuestion);
    } catch (e) {
      setState(() => status = 'Gönderilemedi: $e');
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  Future<void> _pickPhoto(ImageSource source) async {
    final file = await _picker.pickImage(
      source: source,
      maxWidth: 1600,
      imageQuality: 85,
    );
    if (file == null) return;

    final bytes = await file.readAsBytes();
    final b64 = base64Encode(bytes);
    final mime = file.mimeType ?? 'image/jpeg';

    setState(() {
      busy = true;
      status = 'Fotoğraf okunuyor…';
      _pendingImageBase64 = b64;
      _pendingMime = mime;
      _clarificationQuestions = const [];
    });

    try {
      await _submitPhoto();
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  Future<void> _submitPhoto({int? selectedIndex}) async {
    final b64 = _pendingImageBase64;
    if (b64 == null) return;

    final raw = await ref.read(learningApiProvider).photoQuestion(
          imageBase64: b64,
          mimeType: _pendingMime,
          subject: 'Matematik',
          selectedQuestionIndex: selectedIndex,
        );

    if (raw['needsClarification'] == true) {
      final qs = (raw['questions'] as List<dynamic>? ?? const [])
          .map((e) => e.toString())
          .toList();
      final msg = raw['message'] as String? ??
          'Birden fazla soru var. Hangisini çözmemi istiyorsun?';
      setState(() {
        _clarificationQuestions = qs;
        status = msg;
      });
      await _speak(msg);
      return;
    }

    final socratic = ref.read(learningApiProvider).parseSocratic(raw);
    if (socratic != null) {
      _applyTutorResult(socratic);
      setState(() {
        _clarificationQuestions = const [];
        _pendingImageBase64 = null;
      });
      await _speak(socratic.guidingQuestion);
    } else {
      setState(() => status = 'Yanıt alınamadı.');
    }
  }

  @override
  Widget build(BuildContext context) {
    return BrandScaffold(
      title: 'Ödev desteği',
      rotiMood: RotiMood.thinking,
      rotiSize: 150,
      actions: [
        IconButton(
          onPressed: () => context.go('/app'),
          icon: const Icon(Icons.home_rounded, color: Colors.white),
        ),
      ],
      child: Padding(
        padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Expanded(
              flex: 3,
              child: WhiteboardCanvas(
                strokeColor: RotixColors.navy,
                controller: _board,
                readOnly: true,
                showGrid: false,
                onStrokeComplete: () {},
              ),
            ),
            if (_clarificationQuestions.isNotEmpty) ...[
              const SizedBox(height: 10),
              SizedBox(
                height: 110,
                child: ListView.separated(
                  itemCount: _clarificationQuestions.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 6),
                  itemBuilder: (context, i) {
                    return Material(
                      color: Colors.white.withOpacity(0.12),
                      borderRadius: BorderRadius.circular(12),
                      child: InkWell(
                        borderRadius: BorderRadius.circular(12),
                        onTap: busy
                            ? null
                            : () async {
                                setState(() => busy = true);
                                try {
                                  await _submitPhoto(selectedIndex: i);
                                } finally {
                                  if (mounted) setState(() => busy = false);
                                }
                              },
                        child: Padding(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 12,
                            vertical: 10,
                          ),
                          child: Text(
                            '${i + 1}) ${_clarificationQuestions[i]}',
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            style: GoogleFonts.nunito(
                              color: Colors.white,
                              fontWeight: FontWeight.w700,
                              fontSize: 13,
                            ),
                          ),
                        ),
                      ),
                    );
                  },
                ),
              ),
            ],
            const SizedBox(height: 12),
            TextField(
              controller: _questionCtrl,
              maxLines: 2,
              style: GoogleFonts.nunito(color: Colors.white),
              decoration: InputDecoration(
                hintText: 'Tek bir soru yaz…',
                hintStyle: GoogleFonts.nunito(color: Colors.white54),
                filled: true,
                fillColor: Colors.white.withOpacity(0.1),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(16),
                  borderSide: BorderSide.none,
                ),
              ),
            ),
            const SizedBox(height: 10),
            Row(
              children: [
                Expanded(
                  child: FilledButton.icon(
                    onPressed: busy ? null : _askText,
                    icon: const Icon(Icons.send_rounded),
                    label: Text(
                      busy ? '…' : 'Roti’ye sor',
                      style: GoogleFonts.nunito(fontWeight: FontWeight.w800),
                    ),
                    style: FilledButton.styleFrom(
                      backgroundColor: RotixColors.cyan,
                      foregroundColor: RotixColors.navyDeep,
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(16),
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                FilledButton(
                  onPressed: busy
                      ? null
                      : () async {
                          final voice = VoiceListener.instance;
                          if (voice.isListening) {
                            await voice.stop();
                            return;
                          }
                          final ok = await voice.ensureReady();
                          if (!ok) {
                            setState(() {
                              status = voice.lastError ??
                                  'Mikrofon izni gerekli (Chrome)';
                            });
                            return;
                          }
                          setState(() => status = 'Dinliyorum…');
                          await voice.start(
                            onResult: (text, isFinal) {
                              if (!mounted) return;
                              _questionCtrl.text = text;
                              setState(() => status = 'Seni duydum: $text');
                              if (isFinal && text.trim().isNotEmpty) {
                                voice.stop();
                                _askText();
                              }
                            },
                          );
                        },
                  style: FilledButton.styleFrom(
                    backgroundColor: Colors.white.withOpacity(0.15),
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.all(16),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(16),
                    ),
                  ),
                  child: const Icon(Icons.mic_rounded),
                ),
                const SizedBox(width: 8),
                FilledButton(
                  onPressed: busy ? null : () => _pickPhoto(ImageSource.camera),
                  style: FilledButton.styleFrom(
                    backgroundColor: Colors.white.withOpacity(0.15),
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.all(16),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(16),
                    ),
                  ),
                  child: const Icon(Icons.photo_camera_rounded),
                ),
                const SizedBox(width: 8),
                FilledButton(
                  onPressed:
                      busy ? null : () => _pickPhoto(ImageSource.gallery),
                  style: FilledButton.styleFrom(
                    backgroundColor: Colors.white.withOpacity(0.15),
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.all(16),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(16),
                    ),
                  ),
                  child: const Icon(Icons.photo_library_rounded),
                ),
              ],
            ),
            if (status != null) ...[
              const SizedBox(height: 8),
              Text(
                status!,
                style: GoogleFonts.nunito(color: Colors.white70, fontSize: 13),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
