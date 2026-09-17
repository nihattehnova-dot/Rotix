import 'package:sanal_ogretmen/core/network/api_client.dart';

class AuthApi {
  AuthApi(this._client);

  final ApiClient _client;

  Future<Map<String, dynamic>> bootstrap({
    required int gradeLevel,
    String? fullName,
    String? phone,
    String? examTrack,
  }) async {
    final json = await _client.post('/api/auth/bootstrap', body: {
      'gradeLevel': gradeLevel,
      if (fullName != null) 'fullName': fullName,
      if (phone != null) 'phone': phone,
      if (examTrack != null) 'examTrack': examTrack,
    });
    return json['user'] as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> me() async {
    final json = await _client.get('/api/auth/me');
    return json['user'] as Map<String, dynamic>;
  }
}
