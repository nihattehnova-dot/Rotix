import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:sanal_ogretmen/app.dart';
import 'package:sanal_ogretmen/core/auth/auth_service.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await AuthService.instance.init();
  runApp(const ProviderScope(child: SanalOgretmenApp()));
}
