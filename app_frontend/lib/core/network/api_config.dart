/// API connection — override at build/run time:
/// `--dart-define=API_BASE_URL=... --dart-define=SUPABASE_URL=... --dart-define=SUPABASE_ANON_KEY=...`
class ApiConfig {
  const ApiConfig({
    required this.baseUrl,
    this.userId = '',
    this.accessToken,
    this.wsBaseUrl,
  });

  final String baseUrl;
  final String userId;
  final String? accessToken;
  final String? wsBaseUrl;

  String get effectiveWsBase {
    if (wsBaseUrl != null) return wsBaseUrl!;
    final uri = Uri.parse(baseUrl);
    final scheme = uri.scheme == 'https' ? 'wss' : 'ws';
    return '$scheme://${uri.host}${uri.hasPort ? ':${uri.port}' : ''}';
  }

  static ApiConfig fromEnvironment({String? accessToken, String? userId}) {
    const base = String.fromEnvironment(
      'API_BASE_URL',
      defaultValue: 'http://localhost:3000',
    );
    const envUserId = String.fromEnvironment(
      'USER_ID',
      defaultValue: '',
    );
    const supabaseUrl = String.fromEnvironment('SUPABASE_URL');
    const supabaseAnon = String.fromEnvironment('SUPABASE_ANON_KEY');

    return ApiConfig(
      baseUrl: base,
      userId: userId ?? envUserId,
      accessToken: accessToken,
      wsBaseUrl: null,
      // expose for Supabase init
    );
  }

  static String get supabaseUrlFromEnv =>
      const String.fromEnvironment('SUPABASE_URL');

  static String get supabaseAnonFromEnv =>
      const String.fromEnvironment('SUPABASE_ANON_KEY');
}
