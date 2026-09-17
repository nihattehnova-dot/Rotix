import 'package:sanal_ogretmen/core/network/api_client.dart';

class PlanOffer {
  const PlanOffer({
    required this.sku,
    required this.tier,
    required this.period,
    required this.totalPriceTry,
    required this.monthlyListTry,
    required this.labelTr,
    required this.descriptionTr,
    this.annualListIf12Try,
    this.billedMonths = 1,
  });

  final String sku;
  final String tier;
  final String period;
  final num totalPriceTry;
  final num monthlyListTry;
  final num? annualListIf12Try;
  final int billedMonths;
  final String labelTr;
  final String descriptionTr;

  factory PlanOffer.fromJson(Map<String, dynamic> json) {
    return PlanOffer(
      sku: json['sku'] as String,
      tier: json['tier'] as String,
      period: json['period'] as String,
      totalPriceTry: json['totalPriceTry'] as num? ?? 0,
      monthlyListTry: json['monthlyListTry'] as num? ?? 0,
      annualListIf12Try: json['annualListIf12Try'] as num?,
      billedMonths: (json['billedMonths'] as num?)?.toInt() ?? 1,
      labelTr: json['labelTr'] as String? ?? '',
      descriptionTr: json['descriptionTr'] as String? ?? '',
    );
  }

  bool get isAnnual => period == 'annual';

  String get priceLabel {
    if (isAnnual) {
      return '${totalPriceTry.toStringAsFixed(0)} TL / yıl';
    }
    return '${totalPriceTry.toStringAsFixed(0)} TL / ay';
  }
}

class PaymentsApi {
  PaymentsApi(this._client);

  final ApiClient _client;

  Future<Map<String, dynamic>> catalog() async {
    return _client.get('/api/payments/catalog');
  }

  Future<List<PlanOffer>> plans() async {
    final json = await catalog();
    return (json['plans'] as List<dynamic>? ?? const [])
        .whereType<Map<String, dynamic>>()
        .map(PlanOffer.fromJson)
        .toList();
  }

  Future<Map<String, dynamic>> checkout({
    required String sku,
    required String customerEmail,
    required String customerPhone,
    String? buyerName,
    String? buyerTaxId,
  }) async {
    return _client.post('/api/payments/checkout', body: {
      'sku': sku,
      'customerEmail': customerEmail,
      'customerPhone': customerPhone,
      if (buyerName != null) 'buyerName': buyerName,
      if (buyerTaxId != null) 'buyerTaxId': buyerTaxId,
    });
  }
}
