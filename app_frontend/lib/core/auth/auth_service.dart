import 'package:supabase_flutter/supabase_flutter.dart';

/// Tek örnek — `main` init ile Riverpod aynı oturumu paylaşır.
class AuthService {
  AuthService._();
  static final AuthService instance = AuthService._();

  factory AuthService() => instance;

  bool _initialized = false;

  bool get isConfigured {
    const url = String.fromEnvironment('SUPABASE_URL');
    const anon = String.fromEnvironment('SUPABASE_ANON_KEY');
    return url.isNotEmpty && anon.isNotEmpty;
  }

  bool get isReady => _initialized;

  SupabaseClient get _client {
    if (!_initialized) {
      throw StateError(
        'Supabase yapılandırılmadı. Demo için USER_ID ile devam edin '
        'veya SUPABASE_URL + SUPABASE_ANON_KEY dart-define verin.',
      );
    }
    return Supabase.instance.client;
  }

  Session? get session => _initialized ? _client.auth.currentSession : null;
  User? get user => _initialized ? _client.auth.currentUser : null;
  String? get accessToken => session?.accessToken;

  Stream<AuthState> get authChanges {
    if (!_initialized) {
      return const Stream<AuthState>.empty();
    }
    return _client.auth.onAuthStateChange;
  }

  Future<void> init() async {
    if (_initialized) return;
    if (!isConfigured) {
      _initialized = false;
      return;
    }
    const url = String.fromEnvironment('SUPABASE_URL');
    const anon = String.fromEnvironment('SUPABASE_ANON_KEY');
    await Supabase.initialize(url: url, anonKey: anon);
    _initialized = true;
  }

  Future<AuthResponse> signUp({
    required String email,
    required String password,
  }) {
    return _client.auth.signUp(email: email, password: password);
  }

  Future<AuthResponse> signIn({
    required String email,
    required String password,
  }) {
    return _client.auth.signInWithPassword(email: email, password: password);
  }

  Future<void> signOut() {
    if (!_initialized) return Future.value();
    return _client.auth.signOut();
  }
}
