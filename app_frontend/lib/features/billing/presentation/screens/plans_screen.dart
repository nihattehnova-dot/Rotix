import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:sanal_ogretmen/core/api/payments_api.dart';
import 'package:sanal_ogretmen/core/providers/api_providers.dart';
import 'package:url_launcher/url_launcher.dart';

class PlansScreen extends ConsumerStatefulWidget {
  const PlansScreen({super.key});

  @override
  ConsumerState<PlansScreen> createState() => _PlansScreenState();
}

class _PlansScreenState extends ConsumerState<PlansScreen> {
  bool annual = true;
  bool busy = false;
  final emailCtrl = TextEditingController();
  final phoneCtrl = TextEditingController();
  final taxCtrl = TextEditingController();

  @override
  void dispose() {
    emailCtrl.dispose();
    phoneCtrl.dispose();
    taxCtrl.dispose();
    super.dispose();
  }

  Future<void> _checkout(PlanOffer plan) async {
    if (!kIsWeb) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text(
            'Ödeme yalnızca web üzerinden (VakıfPayS). '
            'Lütfen sanalogretmen web sitesinden satın alın.',
          ),
        ),
      );
      return;
    }

    final email = emailCtrl.text.trim();
    final phone = phoneCtrl.text.trim();
    if (email.isEmpty || phone.length < 10) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('E-posta ve telefon zorunlu (e-arşiv).')),
      );
      return;
    }

    setState(() => busy = true);
    try {
      final result = await ref.read(paymentsApiProvider).checkout(
            sku: plan.sku,
            customerEmail: email,
            customerPhone: phone,
            buyerTaxId: taxCtrl.text.trim().isEmpty ? null : taxCtrl.text.trim(),
          );
      final url = result['paymentPageUrl'] as String?;
      if (url == null) throw Exception('Ödeme URL yok');
      final uri = Uri.parse(url);
      if (!await launchUrl(uri, webOnlyWindowName: '_self')) {
        throw Exception('Yönlendirme başarısız');
      }
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
    final catalog = ref.watch(planCatalogProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Paketler')),
      body: catalog.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text('$e')),
        data: (plans) {
          final filtered = plans
              .where((p) => annual ? p.isAnnual : !p.isAnnual)
              .toList();

          return ListView(
            padding: const EdgeInsets.all(20),
            children: [
              Text(
                '1 hafta ücretsiz deneme sonrası kilitlenir. '
                'Ödeme: yalnızca web · VakıfPayS · e-arşiv fatura kesilir.',
                style: GoogleFonts.sourceSans3(color: const Color(0xFF64748B)),
              ),
              const SizedBox(height: 12),
              SegmentedButton<bool>(
                segments: const [
                  ButtonSegment(value: false, label: Text('Aylık')),
                  ButtonSegment(value: true, label: Text('Yıllık (10 ay fiyatı)')),
                ],
                selected: {annual},
                onSelectionChanged: (s) => setState(() => annual = s.first),
              ),
              const SizedBox(height: 16),
              TextField(
                controller: emailCtrl,
                decoration: const InputDecoration(
                  labelText: 'Fatura e-posta',
                ),
                keyboardType: TextInputType.emailAddress,
              ),
              TextField(
                controller: phoneCtrl,
                decoration: const InputDecoration(labelText: 'Telefon'),
                keyboardType: TextInputType.phone,
              ),
              TextField(
                controller: taxCtrl,
                decoration: const InputDecoration(
                  labelText: 'VKN / TCKN (opsiyonel)',
                ),
              ),
              const SizedBox(height: 16),
              for (final plan in filtered)
                Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: DecoratedBox(
                    decoration: BoxDecoration(
                      border: Border.all(color: const Color(0xFFCBD5E1)),
                    ),
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            plan.labelTr,
                            style: GoogleFonts.ibmPlexSans(
                              fontWeight: FontWeight.w700,
                              fontSize: 18,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(plan.descriptionTr),
                          const SizedBox(height: 8),
                          Text(
                            plan.priceLabel,
                            style: GoogleFonts.ibmPlexSans(
                              fontSize: 22,
                              fontWeight: FontWeight.w700,
                              color: const Color(0xFF0F766E),
                            ),
                          ),
                          if (plan.isAnnual && plan.annualListIf12Try != null)
                            Text(
                              '12 ay liste: ${plan.annualListIf12Try!.toStringAsFixed(0)} TL → '
                              'siz ${plan.totalPriceTry.toStringAsFixed(0)} TL ödersiniz',
                              style: GoogleFonts.sourceSans3(
                                fontSize: 12,
                                color: const Color(0xFF64748B),
                              ),
                            ),
                          const SizedBox(height: 12),
                          FilledButton(
                            onPressed: busy ? null : () => _checkout(plan),
                            child: Text(
                              kIsWeb
                                  ? 'VakıfPayS ile öde'
                                  : 'Web’den satın al',
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
            ],
          );
        },
      ),
    );
  }
}
