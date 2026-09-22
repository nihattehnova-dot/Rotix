import 'dart:async';
import 'dart:convert';

import 'package:http/http.dart' as http;
import 'package:sanal_ogretmen/core/models/socratic_result.dart';
import 'package:sanal_ogretmen/core/network/api_client.dart';
import 'package:sanal_ogretmen/core/network/api_config.dart';
import 'package:sanal_ogretmen/core/network/api_exception.dart';
import 'package:sanal_ogretmen/core/auth/auth_service.dart';

class AiApi {
  AiApi(this._client, {ApiConfig? config}) : _config = config;

  final ApiClient _client;
  final ApiConfig? _config;

  Future<SocraticResponse> socratic({
    String? subject,
    required String questionText,
    String? studentAnswer,
    String? topic,
    String? sessionId,
    bool logAsMistake = true,
    int? struggleScore,
    bool? answerWrong,
    String? imageBase64,
    String? imageMimeType,
  }) async {
    final json = await _client.post('/api/ai/socratic', body: {
      if (subject != null) 'subject': subject,
      'questionText': questionText,
      if (studentAnswer != null) 'studentAnswer': studentAnswer,
      if (topic != null) 'topic': topic,
      if (sessionId != null) 'sessionId': sessionId,
      'logAsMistake': logAsMistake,
      if (struggleScore != null) 'struggleScore': struggleScore,
      if (answerWrong != null) 'answerWrong': answerWrong,
      if (imageBase64 != null) 'imageBase64': imageBase64,
      if (imageMimeType != null) 'imageMimeType': imageMimeType,
    });
    return SocraticResponse.fromJson(json);
  }

  /// SSE socratic — token/cümle + canvas event; done’da tam yanıt.
  Future<SocraticResponse> socraticStream({
    String? subject,
    required String questionText,
    String? studentAnswer,
    String? topic,
    String? sessionId,
    bool logAsMistake = true,
    int? struggleScore,
    bool? answerWrong,
    String? imageBase64,
    String? imageMimeType,
    void Function(String accumulated)? onNarration,
    void Function(Map<String, dynamic> command)? onCanvas,
  }) async {
    final config = _config;
    if (config == null) {
      return socratic(
        subject: subject,
        questionText: questionText,
        studentAnswer: studentAnswer,
        topic: topic,
        sessionId: sessionId,
        logAsMistake: logAsMistake,
        struggleScore: struggleScore,
        answerWrong: answerWrong,
        imageBase64: imageBase64,
        imageMimeType: imageMimeType,
      );
    }

    final base = config.baseUrl.endsWith('/')
        ? config.baseUrl.substring(0, config.baseUrl.length - 1)
        : config.baseUrl;
    final uri = Uri.parse('$base/api/ai/socratic/stream');
    final headers = <String, String>{
      'Content-Type': 'application/json',
      'Accept': 'text/event-stream',
    };
    final live = AuthService.instance.accessToken;
    final token =
        (live != null && live.isNotEmpty) ? live : config.accessToken;
    if (token != null && token.isNotEmpty) {
      headers['Authorization'] = 'Bearer $token';
    } else if (config.userId.isNotEmpty) {
      headers['X-User-Id'] = config.userId;
    }

    final body = jsonEncode({
      if (subject != null) 'subject': subject,
      'questionText': questionText,
      if (studentAnswer != null) 'studentAnswer': studentAnswer,
      if (topic != null) 'topic': topic,
      if (sessionId != null) 'sessionId': sessionId,
      'logAsMistake': logAsMistake,
      if (struggleScore != null) 'struggleScore': struggleScore,
      if (answerWrong != null) 'answerWrong': answerWrong,
      if (imageBase64 != null) 'imageBase64': imageBase64,
      if (imageMimeType != null) 'imageMimeType': imageMimeType,
    });

    final req = http.Request('POST', uri)
      ..headers.addAll(headers)
      ..body = body;
    final streamed = await http.Client().send(req).timeout(
          const Duration(seconds: 90),
        );
    if (streamed.statusCode < 200 || streamed.statusCode >= 300) {
      final errBody = await streamed.stream.bytesToString();
      throw ApiException(
        message: 'Stream başarısız (${streamed.statusCode})',
        statusCode: streamed.statusCode,
      );
    }

    String? eventName;
    final dataBuf = StringBuffer();
    Map<String, dynamic>? donePayload;

    await for (final chunk in streamed.stream.transform(utf8.decoder)) {
      for (final line in chunk.split('\n')) {
        if (line.startsWith('event:')) {
          eventName = line.substring(6).trim();
        } else if (line.startsWith('data:')) {
          dataBuf.writeln(line.substring(5).trim());
        } else if (line.trim().isEmpty && dataBuf.isNotEmpty) {
          final raw = dataBuf.toString().trim();
          dataBuf.clear();
          final name = eventName ?? 'message';
          eventName = null;
          try {
            final data = jsonDecode(raw) as Map<String, dynamic>;
            if (name == 'token') {
              final acc = data['accumulated'] as String? ?? '';
              onNarration?.call(acc);
            } else if (name == 'canvas') {
              final cmd = data['command'];
              if (cmd is Map<String, dynamic>) onCanvas?.call(cmd);
            } else if (name == 'done') {
              donePayload = data;
            } else if (name == 'error') {
              throw ApiException(
                message: data['message'] as String? ?? 'stream error',
              );
            }
          } catch (e) {
            if (e is ApiException) rethrow;
          }
        }
      }
    }

    if (donePayload == null) {
      throw ApiException(message: 'Stream tamamlanamadı');
    }
    return SocraticResponse.fromJson(donePayload);
  }
}
