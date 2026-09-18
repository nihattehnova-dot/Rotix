import 'package:sanal_ogretmen/core/models/socratic_result.dart';
import 'package:sanal_ogretmen/core/network/api_client.dart';

class AiApi {
  AiApi(this._client);

  final ApiClient _client;

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
}
