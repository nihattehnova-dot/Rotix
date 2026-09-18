/// Non-web stub — streaming PCM yok.
class StreamingPcmPlayer {
  StreamingPcmPlayer();

  void Function(double level)? onLevel;
  void Function()? onDone;

  Future<void> ensureStarted() async {}
  Future<void> stop() async {
    onLevel?.call(0);
  }

  Future<void> enqueueBase64(String b64, String mime) async {}
  void markStreamDone() => onDone?.call();
}
