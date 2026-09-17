import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:sanal_ogretmen/core/api/auth_api.dart';
import 'package:sanal_ogretmen/core/network/api_client.dart';
import 'package:sanal_ogretmen/core/network/api_config.dart';
import 'package:sanal_ogretmen/core/providers/api_providers.dart';

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final emailCtrl = TextEditingController();
  final passCtrl = TextEditingController();
  bool signUp = false;
  bool busy = false;
  int grade = 5;

  @override
  void dispose() {
    emailCtrl.dispose();
    passCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    setState(() => busy = true);
    try {
      final auth = ref.read(authServiceProvider);
      if (!auth.isConfigured) {
        if (mounted) context.go('/app');
        return;
      }

      if (signUp) {
        await auth.signUp(email: emailCtrl.text.trim(), password: passCtrl.text);
      } else {
        await auth.signIn(email: emailCtrl.text.trim(), password: passCtrl.text);
      }

      final token = auth.accessToken;
      if (token == null) throw Exception('Oturum token alınamadı');

      final bootstrapClient = ApiClient(
        config: ApiConfig.fromEnvironment(accessToken: token),
      );
      try {
        await AuthApi(bootstrapClient).bootstrap(
          gradeLevel: grade,
          fullName: emailCtrl.text.split('@').first,
        );
      } finally {
        bootstrapClient.close();
      }

      if (mounted) context.go('/app');
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('$e')),
        );
      }
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final authConfigured = ref.watch(authServiceProvider).isConfigured;

    return Scaffold(
      appBar: AppBar(title: const Text('Giriş')),
      body: ListView(
        padding: const EdgeInsets.all(24),
        children: [
          Text(
            authConfigured ? 'Supabase hesabın' : 'Supabase yapılandırılmadı',
            style: GoogleFonts.ibmPlexSans(
              fontSize: 22,
              fontWeight: FontWeight.w700,
            ),
          ),
          if (!authConfigured)
            Padding(
              padding: const EdgeInsets.only(top: 8, bottom: 16),
              child: Text(
                'SUPABASE_URL ve SUPABASE_ANON_KEY olmadan demo moda geçilir.',
                style: GoogleFonts.sourceSans3(color: const Color(0xFF64748B)),
              ),
            ),
          TextField(
            controller: emailCtrl,
            decoration: const InputDecoration(labelText: 'E-posta'),
          ),
          TextField(
            controller: passCtrl,
            decoration: const InputDecoration(labelText: 'Şifre'),
            obscureText: true,
          ),
          if (signUp) ...[
            Text('Sınıf: $grade'),
            Slider(
              value: grade.toDouble(),
              min: 1,
              max: 12,
              divisions: 11,
              label: '$grade',
              onChanged: (v) => setState(() => grade = v.round()),
            ),
          ],
          const SizedBox(height: 16),
          FilledButton(
            onPressed: busy ? null : _submit,
            child: Text(signUp ? 'Kayıt ol' : 'Giriş yap'),
          ),
          TextButton(
            onPressed: () => setState(() => signUp = !signUp),
            child: Text(signUp ? 'Zaten hesabım var' : 'Hesap oluştur'),
          ),
          TextButton(
            onPressed: () => context.go('/app'),
            child: const Text('Demo mod (auth yok)'),
          ),
        ],
      ),
    );
  }
}
