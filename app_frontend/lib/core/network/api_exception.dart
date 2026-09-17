class ApiException implements Exception {
  ApiException({
    required this.message,
    this.statusCode,
    this.code,
  });

  final String message;
  final int? statusCode;
  final String? code;

  bool get isQuota =>
      code == 'QUOTA_MONTHLY_QUESTIONS' || code == 'QUOTA_DAILY_MINUTES';

  @override
  String toString() => 'ApiException($statusCode, $code): $message';
}
