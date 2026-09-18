import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:sanal_ogretmen/core/api/auth_api.dart';
import 'package:sanal_ogretmen/core/network/api_client.dart';
import 'package:sanal_ogretmen/core/network/api_config.dart';
import 'package:sanal_ogretmen/core/providers/api_providers.dart';
import 'package:sanal_ogretmen/core/theme/app_theme.dart';

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final emailCtrl = TextEditingController();
  final passCtrl = TextEditingController();
  bool signUp = true;
  bool busy = false;
  int grade = 5;
  String? hint;

  @override
  void dispose() {
    emailCtrl.dispose();
    passCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    setState(() {
      busy = true;
      hint = null;
    });
    try {
      final auth = ref.read(authServiceProvider);
      if (!auth.isConfigured) {
        if (mounted) context.go('/app');
        return;
      }

      final email = emailCtrl.text.trim();
      final password = passCtrl.text;
      if (email.isEmpty || password.length < 6) {
        throw Exception('E-posta gir ve şifre en az 6 karakter olsun.');
      }

      if (signUp) {
        await auth.signUp(email: email, password: password);
      } else {
        await auth.signIn(email: email, password: password);
      }

      var token = auth.accessToken;
      // E-posta onayı açıksa kayıtta session gelmez — bir kez giriş dene
      if (token == null && signUp) {
        try {
          await auth.signIn(email: email, password: password);
          token = auth.accessToken;
        } catch (_) {}
      }

      if (token == null) {
        setState(() {
          signUp = false;
          hint =
              'Kayıt alındı. E-postandaki onay linkine tıkla, sonra burada Giriş yap. '
              '(Onay maili yoksa 1 dk bekle; çok denediysen biraz bekle — rate limit.)';
        });
        return;
      }

      final bootstrapClient = ApiClient(
        config: ApiConfig.fromEnvironment(accessToken: token),
      );
      try {
        await AuthApi(bootstrapClient).bootstrap(
          gradeLevel: grade,
          fullName: email.split('@').first,
        );
      } finally {
        bootstrapClient.close();
      }

      if (mounted) context.go('/app');
    } catch (e) {
      final raw = e.toString();
      String msg = raw;
      if (raw.contains('over_email_send_rate_limit') || raw.contains('48')) {
        msg =
            'Çok hızlı denendi. 1 dakika bekle, sonra tekrar Kayıt ol / Giriş yap.';
      } else if (raw.contains('Invalid login')) {
        msg = 'E-posta veya şifre hatalı. Kayıt olmadıysan «Hesap oluştur».';
      } else if (raw.contains('already registered') ||
          raw.contains('User already')) {
        msg = 'Bu e-posta kayıtlı. «Zaten hesabım var» ile giriş yap.';
        signUp = false;
      }
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(msg)),
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
      appBar: AppBar(title: Text(signUp ? 'Hesap oluştur' : 'Giriş yap')),
      body: ListView(
        padding: const EdgeInsets.all(24),
        children: [
          Text(
            'Rotix hesabı',
            style: GoogleFonts.nunito(
              fontSize: 22,
              fontWeight: FontWeight.w800,
              color: RotixColors.textPrimary,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            authConfigured
                ? 'Sadece bu uygulama için e-posta ve şifre. Ayrı bir “Supabase üyeliği” gerekmez.'
                : 'Auth yapılandırılmamış — demo moda geçilir.',
            style: GoogleFonts.nunito(
              color: RotixColors.textMuted,
              fontSize: 14,
            ),
          ),
          if (hint != null) ...[
            const SizedBox(height: 12),
            Text(
              hint!,
              style: GoogleFonts.nunito(
                color: RotixColors.neon,
                fontWeight: FontWeight.w700,
              ),
            ),
          ],
          const SizedBox(height: 16),
          TextField(
            controller: emailCtrl,
            keyboardType: TextInputType.emailAddress,
            decoration: const InputDecoration(labelText: 'E-posta'),
          ),
          TextField(
            controller: passCtrl,
            decoration: const InputDecoration(labelText: 'Şifre (en az 6 karakter)'),
            obscureText: true,
          ),
          if (signUp) ...[
            const SizedBox(height: 8),
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
            onPressed: busy
                ? null
                : () => setState(() {
                      signUp = !signUp;
                      hint = null;
                    }),
            child: Text(signUp ? 'Zaten hesabım var — giriş yap' : 'Hesap oluştur'),
          ),
        ],
      ),
    );
  }
}
