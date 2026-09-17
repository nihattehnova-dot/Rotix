Future<MicPrimeResult> primeMicrophone() async {
  return const MicPrimeResult(ok: true);
}

void releaseMicrophone() {}

class MicPrimeResult {
  const MicPrimeResult({
    required this.ok,
    this.errorCode,
    this.message,
  });

  final bool ok;
  final String? errorCode;
  final String? message;
}
