import 'package:sanal_ogretmen/core/models/quota_snapshot.dart';
import 'package:sanal_ogretmen/core/network/api_client.dart';

class QuotasApi {
  QuotasApi(this._client);

  final ApiClient _client;

  Future<QuotaSnapshot> me() async {
    final json = await _client.get('/api/quotas/me');
    return QuotaSnapshot.fromJson(json['quota'] as Map<String, dynamic>);
  }
}
