import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:sanal_ogretmen/core/router/app_router.dart';
import 'package:sanal_ogretmen/core/theme/app_theme.dart';

class SanalOgretmenApp extends ConsumerWidget {
  const SanalOgretmenApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return MaterialApp.router(
      title: 'Rotix',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light(),
      routerConfig: appRouter,
    );
  }
}
