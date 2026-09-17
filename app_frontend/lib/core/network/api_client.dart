import 'dart:convert';

import 'package:http/http.dart' as http;
import 'package:sanal_ogretmen/core/auth/auth_service.dart';
import 'package:sanal_ogretmen/core/network/api_config.dart';
import 'package:sanal_ogretmen/core/network/api_exception.dart';

typedef JsonMap = Map<String, dynamic>;

class ApiClient {
  ApiClient({
    required this.config,
    http.Client? httpClient,
  }) : _http = httpClient ?? http.Client();

  final ApiConfig config;
  final http.Client _http;

  Uri _uri(String path, [Map<String, String>? query]) {
    final base = config.baseUrl.endsWith('/')
        ? config.baseUrl.substring(0, config.baseUrl.length - 1)
        : config.baseUrl;
    return Uri.parse('$base$path').replace(queryParameters: query);
  }

  Map<String, String> get _headers {
    final h = <String, String>{
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
    // Her istekte güncel token (stale Provider config’e güvenme)
    final live = AuthService.instance.accessToken;
    final token = (live != null && live.isNotEmpty)
        ? live
        : config.accessToken;
    if (token != null && token.isNotEmpty) {
      h['Authorization'] = 'Bearer $token';
    } else if (config.userId.isNotEmpty) {
      h['X-User-Id'] = config.userId;
    }
    return h;
  }

  Future<JsonMap> get(String path, {Map<String, String>? query}) async {
    final res = await _http.get(_uri(path, query), headers: _headers);
    return _decode(res);
  }

  Future<JsonMap> post(String path, {Object? body}) async {
    final res = await _http.post(
      _uri(path),
      headers: _headers,
      body: body == null ? null : jsonEncode(body),
    );
    return _decode(res);
  }

  JsonMap _decode(http.Response res) {
    JsonMap? json;
    if (res.body.isNotEmpty) {
      final decoded = jsonDecode(res.body);
      if (decoded is Map<String, dynamic>) {
        json = decoded;
      }
    }

    if (res.statusCode >= 200 && res.statusCode < 300) {
      return json ?? <String, dynamic>{};
    }

    throw ApiException(
      message: (json?['error'] as String?) ??
          'İstek başarısız (${res.statusCode})',
      statusCode: res.statusCode,
      code: json?['code'] as String?,
    );
  }

  void close() => _http.close();
}
