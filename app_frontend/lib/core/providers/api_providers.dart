import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:sanal_ogretmen/core/api/ai_api.dart';
import 'package:sanal_ogretmen/core/api/learning_api.dart';
import 'package:sanal_ogretmen/core/api/mistakes_api.dart';
import 'package:sanal_ogretmen/core/api/payments_api.dart';
import 'package:sanal_ogretmen/core/api/quotas_api.dart';
import 'package:sanal_ogretmen/core/api/sessions_api.dart';
import 'package:sanal_ogretmen/core/auth/auth_service.dart';
import 'package:sanal_ogretmen/core/models/quota_snapshot.dart';
import 'package:sanal_ogretmen/core/models/user_mistake.dart';
import 'package:sanal_ogretmen/core/network/api_client.dart';
import 'package:sanal_ogretmen/core/network/api_config.dart';

final authServiceProvider = Provider<AuthService>((ref) => AuthService.instance);

final authSessionProvider = StreamProvider((ref) {
  return ref.watch(authServiceProvider).authChanges;
});

final apiConfigProvider = Provider<ApiConfig>((ref) {
  // Oturum değişince token’ı yenile
  ref.watch(authSessionProvider);
  final auth = ref.watch(authServiceProvider);
  final token = auth.isReady ? auth.accessToken : null;
  final userId = (auth.isReady && auth.user != null)
      ? ''
      : ApiConfig.fromEnvironment().userId;
  return ApiConfig.fromEnvironment(
    accessToken: token,
    userId: userId,
  );
});

final apiClientProvider = Provider<ApiClient>((ref) {
  final client = ApiClient(config: ref.watch(apiConfigProvider));
  ref.onDispose(client.close);
  return client;
});

final sessionsApiProvider = Provider<SessionsApi>((ref) {
  return SessionsApi(ref.watch(apiClientProvider));
});

final mistakesApiProvider = Provider<MistakesApi>((ref) {
  return MistakesApi(ref.watch(apiClientProvider));
});

final quotasApiProvider = Provider<QuotasApi>((ref) {
  return QuotasApi(ref.watch(apiClientProvider));
});

final aiApiProvider = Provider<AiApi>((ref) {
  return AiApi(
    ref.watch(apiClientProvider),
    config: ref.watch(apiConfigProvider),
  );
});

final learningApiProvider = Provider<LearningApi>((ref) {
  return LearningApi(ref.watch(apiClientProvider));
});

final paymentsApiProvider = Provider<PaymentsApi>((ref) {
  return PaymentsApi(ref.watch(apiClientProvider));
});

final planCatalogProvider = FutureProvider<List<PlanOffer>>((ref) async {
  return ref.watch(paymentsApiProvider).plans();
});

final quotaSnapshotProvider = FutureProvider<QuotaSnapshot>((ref) async {
  return ref.watch(quotasApiProvider).me();
});

final dueMistakesProvider = FutureProvider<List<UserMistake>>((ref) async {
  return ref.watch(mistakesApiProvider).due();
});

final accessInfoProvider = FutureProvider<AccessInfo>((ref) async {
  return ref.watch(learningApiProvider).access();
});

final todayPlanProvider = FutureProvider<StudyPlan>((ref) async {
  return ref.watch(learningApiProvider).todayPlan();
});
