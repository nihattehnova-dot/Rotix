import 'package:sanal_ogretmen/core/models/user_mistake.dart';
import 'package:sanal_ogretmen/core/network/api_client.dart';

class MistakesApi {
  MistakesApi(this._client);

  final ApiClient _client;

  Future<List<UserMistake>> list({bool? resolved, int limit = 50}) async {
    final query = <String, String>{'limit': '$limit'};
    if (resolved != null) query['resolved'] = '$resolved';
    final json = await _client.get('/api/mistakes', query: query);
    final list = json['mistakes'] as List<dynamic>? ?? const [];
    return list
        .whereType<Map<String, dynamic>>()
        .map(UserMistake.fromJson)
        .toList();
  }

  Future<List<UserMistake>> due({int limit = 20}) async {
    final json = await _client.get(
      '/api/mistakes/due',
      query: {'limit': '$limit'},
    );
    final list = json['mistakes'] as List<dynamic>? ?? const [];
    return list
        .whereType<Map<String, dynamic>>()
        .map(UserMistake.fromJson)
        .toList();
  }

  Future<UserMistake> log({
    required QuestionData questionData,
    String? sessionId,
    String? subject,
    String? topic,
    int? struggleScore,
  }) async {
    final json = await _client.post('/api/mistakes', body: {
      'questionData': questionData.toJson(),
      if (sessionId != null) 'sessionId': sessionId,
      if (subject != null) 'subject': subject,
      if (topic != null) 'topic': topic,
      if (struggleScore != null) 'struggleScore': struggleScore,
    });
    return UserMistake.fromJson(json['mistake'] as Map<String, dynamic>);
  }

  Future<UserMistake> review(
    String id, {
    required bool mastered,
    bool? markResolved,
  }) async {
    final json = await _client.post('/api/mistakes/$id/review', body: {
      'mastered': mastered,
      if (markResolved != null) 'markResolved': markResolved,
    });
    return UserMistake.fromJson(json['mistake'] as Map<String, dynamic>);
  }

  Future<UserMistake> resolve(String id) async {
    final json = await _client.post('/api/mistakes/$id/resolve');
    return UserMistake.fromJson(json['mistake'] as Map<String, dynamic>);
  }
}
