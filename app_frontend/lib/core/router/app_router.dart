import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:sanal_ogretmen/core/auth/auth_service.dart';
import 'package:sanal_ogretmen/features/auth/presentation/screens/login_screen.dart';
import 'package:sanal_ogretmen/features/billing/presentation/screens/plans_screen.dart';
import 'package:sanal_ogretmen/features/evening_review/presentation/screens/evening_review_screen.dart';
import 'package:sanal_ogretmen/features/home/presentation/screens/home_shell_screen.dart';
import 'package:sanal_ogretmen/features/home/presentation/screens/landing_screen.dart';
import 'package:sanal_ogretmen/features/learning/presentation/screens/homework_support_screen.dart';
import 'package:sanal_ogretmen/features/learning/presentation/screens/micro_quiz_screen.dart';
import 'package:sanal_ogretmen/features/learning/presentation/screens/parent_dashboard_screen.dart';
import 'package:sanal_ogretmen/features/learning/presentation/screens/study_plan_screen.dart';
import 'package:sanal_ogretmen/features/learning/presentation/screens/weak_topics_screen.dart';
import 'package:sanal_ogretmen/features/onboarding/presentation/screens/onboarding_screen.dart';

final appRouter = GoRouter(
  initialLocation: '/',
  refreshListenable: _AuthRefresh(),
  redirect: (context, state) {
    final auth = AuthService.instance;
    if (!auth.isConfigured || !auth.isReady) return null;

    final loggedIn = auth.session != null;
    final loc = state.matchedLocation;
    final onAuthGate = loc == '/login' ||
        loc == '/' ||
        loc == '/onboarding';

    if (!loggedIn && !onAuthGate) {
      return '/login';
    }
    if (loggedIn && loc == '/login') {
      return '/app';
    }
    return null;
  },
  routes: [
    GoRoute(
      path: '/',
      builder: (context, state) => const LandingScreen(),
    ),
    GoRoute(
      path: '/onboarding',
      builder: (context, state) => const OnboardingScreen(),
    ),
    GoRoute(
      path: '/login',
      builder: (context, state) => const LoginScreen(),
    ),
    GoRoute(
      path: '/app',
      builder: (context, state) => const HomeShellScreen(),
      routes: [
        GoRoute(
          path: 'evening',
          builder: (context, state) => const EveningReviewScreen(
            demoGradeLevel: 5,
            studentName: 'Elif',
          ),
        ),
        GoRoute(
          path: 'homework',
          builder: (context, state) => const HomeworkSupportScreen(),
        ),
        GoRoute(
          path: 'plan',
          builder: (context, state) => const StudyPlanScreen(),
        ),
        GoRoute(
          path: 'weak',
          builder: (context, state) => const WeakTopicsScreen(),
        ),
        GoRoute(
          path: 'parent',
          builder: (context, state) => const ParentDashboardScreen(),
        ),
        GoRoute(
          path: 'plans',
          builder: (context, state) => const PlansScreen(),
        ),
        GoRoute(
          path: 'quiz',
          builder: (context, state) {
            final q = state.uri.queryParameters;
            return MicroQuizScreen(
              curriculumId: q['curriculumId'] ?? '',
              subject: q['subject'] ?? 'Matematik',
              topic: q['topic'] ?? 'Konu',
            );
          },
        ),
      ],
    ),
  ],
);

/// GoRouter’ın oturum değişimini görmesi için.
class _AuthRefresh extends ChangeNotifier {
  _AuthRefresh() {
    Future<void>.microtask(_attach);
  }

  bool _attached = false;

  void _attach() {
    if (_attached) return;
    final auth = AuthService.instance;
    if (!auth.isReady) {
      Future<void>.delayed(const Duration(milliseconds: 50), _attach);
      return;
    }
    _attached = true;
    auth.authChanges.listen((_) => notifyListeners());
    notifyListeners();
  }
}
