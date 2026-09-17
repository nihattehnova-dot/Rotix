import 'dart:typed_data';

import 'package:flutter/material.dart';

import 'webcam_capture_stub.dart'
    if (dart.library.html) 'webcam_capture_web.dart' as platform;

/// Web: canlı webcam diyaloğu. Diğer platformlar: null.
Future<Uint8List?> captureWebcamPhoto(BuildContext context) {
  return platform.captureWebcamPhoto(context);
}
