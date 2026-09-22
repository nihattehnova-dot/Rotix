import 'package:flutter_test/flutter_test.dart';
import 'package:sanal_ogretmen/core/models/socratic_result.dart';

void main() {
  group('short answer routing rules', () {
    bool looksLikeShortAnswer(String trimmed, bool hasActive) {
      final lower = trimmed.toLowerCase();
      final isQuestion = lower.contains('?') ||
          lower.contains('nasıl') ||
          lower.contains('nedir') ||
          lower.contains('anlamad') ||
          lower.contains('çöz') ||
          lower.contains('yardım');
      final looksLikeAnswer = RegExp(
            r'^[\d\s.,+\-*/=xXyYa-zA-ZçğıöşüÇĞİÖŞÜ]+$',
          ).hasMatch(trimmed) &&
          trimmed.length <= 40;
      return hasActive &&
          (looksLikeAnswer || trimmed.length <= 24) &&
          !isQuestion;
    }

    test('accepts single-digit and equation answers', () {
      expect(looksLikeShortAnswer('5', true), isTrue);
      expect(looksLikeShortAnswer('12', true), isTrue);
      expect(looksLikeShortAnswer('x=3', true), isTrue);
    });

    test('rejects without active session', () {
      expect(looksLikeShortAnswer('5', false), isFalse);
    });

    test('rejects help phrases as answers', () {
      expect(looksLikeShortAnswer('anlamadım', true), isFalse);
      expect(looksLikeShortAnswer('nasıl çözülür', true), isFalse);
    });
  });

  group('SocraticResult JSON', () {
    test('parses canvas shape commands', () {
      final r = SocraticResult.fromJson({
        'guidingQuestion': 'Hangi açı?',
        'spokenNarration': 'Şekilde şu açıya bak.',
        'canvasCommands': [
          {'type': 'clear'},
          {'type': 'shape', 'x': 10, 'y': 20, 'w': 100, 'h': 100},
          {'type': 'arrow', 'x1': 1, 'y1': 2, 'x2': 3, 'y2': 4},
        ],
        'tokensUsed': 12,
        'interactionTurnCount': 2,
        'stageComplete': false,
        'forceRevealApplied': false,
      });
      expect(r.guidingQuestion, 'Hangi açı?');
      expect(r.spokenNarration, 'Şekilde şu açıya bak.');
      expect(r.narrationText, 'Şekilde şu açıya bak.');
      expect(r.canvasCommands.length, 3);
      expect(r.canvasCommands[1].type, 'shape');
      expect(r.canvasCommands[2].type, 'arrow');
      expect(r.interactionTurnCount, 2);
    });

    test('narrationText falls back to guidingQuestion', () {
      final r = SocraticResult.fromJson({
        'guidingQuestion': 'İpucu burada',
        'canvasCommands': [],
      });
      expect(r.narrationText, 'İpucu burada');
    });

    test('SocraticResponse lifts spokenNarration from top level', () {
      final res = SocraticResponse.fromJson({
        'socratic': {
          'guidingQuestion': 'özet',
          'canvasCommands': [],
        },
        'spokenNarration': 'Şimdi çözümü anlatalım. Hipotenüs…',
        'forceRevealApplied': true,
        'stageComplete': true,
      });
      expect(res.socratic.spokenNarration, contains('Hipotenüs'));
      expect(res.socratic.forceRevealApplied, isTrue);
      expect(res.socratic.stageComplete, isTrue);
    });

    test('SocraticResponse reads video card', () {
      final res = SocraticResponse.fromJson({
        'socratic': {
          'guidingQuestion': 'ok',
          'canvasCommands': [],
        },
        'video': {
          'title': 'EBOB',
          'youtubeId': 'abc',
          'startSeconds': 30,
          'embedUrl': 'https://www.youtube.com/embed/abc?start=30',
          'watchUrl': 'https://www.youtube.com/watch?v=abc&t=30s',
          'headline': 'Anlamadıysan 2 dakikalık nokta atışı video özeti:',
        },
        'interactionTurnCount': 2,
      });
      expect(res.video?['youtubeId'], 'abc');
      expect(res.interactionTurnCount, 2);
    });
  });

  group('follow-up image policy', () {
    bool shouldSendImage({
      required bool hasImage,
      required int turn,
      String? studentAnswer,
    }) {
      return hasImage && turn <= 1 && (studentAnswer == null || studentAnswer.isEmpty);
    }

    test('first turn with photo sends image', () {
      expect(
        shouldSendImage(hasImage: true, turn: 1),
        isTrue,
      );
    });

    test('follow-up with answer does not send image', () {
      expect(
        shouldSendImage(hasImage: true, turn: 2, studentAnswer: '5'),
        isFalse,
      );
    });
  });
}
