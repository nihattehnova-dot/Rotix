import 'package:sanal_ogretmen/core/models/socratic_result.dart';
import 'package:sanal_ogretmen/core/network/api_client.dart';

class AiApi {
  AiApi(this._client);

  final ApiClient _client;

  Future<SocraticResponse> socratic({
    required String subject,
    required String questionText,
    String? studentAnswer,
    String? topic,
    String? sessionId,
    bool logAsMistake = true,
    int? struggleScore,
  }) async {
    final json = await _client.post('/api/ai/socratic', body: {
      'subject': subject,
      'questionText': questionText,
      if (studentAnswer != null) 'studentAnswer': studentAnswer,
      if (topic != null) 'topic': topic,
      if (sessionId != null) 'sessionId': sessionId,
      'logAsMistake': logAsMistake,
      if (struggleScore != null) 'struggleScore': struggleScore,
    });
    return SocraticResponse.fromJson(json);
  }
}
