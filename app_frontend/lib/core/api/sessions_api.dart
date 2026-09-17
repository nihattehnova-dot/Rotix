import 'package:sanal_ogretmen/core/models/tutor_session.dart';
import 'package:sanal_ogretmen/core/network/api_client.dart';

class SessionsApi {
  SessionsApi(this._client);

  final ApiClient _client;

  Future<TutorSession> start({
    String? mode,
    bool? hadNewSchoolTopic,
    List<String>? topicsCovered,
  }) async {
    final json = await _client.post('/api/sessions', body: {
      if (mode != null) 'mode': mode,
      if (hadNewSchoolTopic != null) 'hadNewSchoolTopic': hadNewSchoolTopic,
      if (topicsCovered != null) 'topicsCovered': topicsCovered,
    });
    return TutorSession.fromJson(json['session'] as Map<String, dynamic>);
  }

  Future<List<TutorSession>> list({int limit = 20}) async {
    final json = await _client.get(
      '/api/sessions',
      query: {'limit': '$limit'},
    );
    final list = json['sessions'] as List<dynamic>? ?? const [];
    return list
        .whereType<Map<String, dynamic>>()
        .map(TutorSession.fromJson)
        .toList();
  }

  Future<TutorSession> getById(String id) async {
    final json = await _client.get('/api/sessions/$id');
    return TutorSession.fromJson(json['session'] as Map<String, dynamic>);
  }

  Future<TutorSession> end(
    String id, {
    List<String>? topicsCovered,
    int? tokensUsed,
    double? successRate,
    int? pointsEarned,
  }) async {
    final json = await _client.post('/api/sessions/$id/end', body: {
      if (topicsCovered != null) 'topicsCovered': topicsCovered,
      if (tokensUsed != null) 'tokensUsed': tokensUsed,
      if (successRate != null) 'successRate': successRate,
      if (pointsEarned != null) 'pointsEarned': pointsEarned,
    });
    return TutorSession.fromJson(json['session'] as Map<String, dynamic>);
  }
}
