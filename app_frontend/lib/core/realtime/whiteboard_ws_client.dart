import 'dart:async';
import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:web_socket_channel/web_socket_channel.dart';

typedef RemoteStrokeHandler = void Function(Map<String, dynamic> stroke);
typedef RemoteClearHandler = void Function();
typedef RemotePhaseHandler = void Function(String phase);
typedef RemoteCanvasHandler = void Function(List<Map<String, dynamic>> commands);
typedef AudioEventHandler = void Function(Map<String, dynamic> data);

class WhiteboardWsClient {
  WhiteboardWsClient({required this.wsBaseUrl});

  final String wsBaseUrl;
  WebSocketChannel? _channel;
  StreamSubscription? _sub;
  String? lastError;

  RemoteStrokeHandler? onRemoteStroke;
  RemoteClearHandler? onRemoteClear;
  RemotePhaseHandler? onRemotePhase;
  RemoteCanvasHandler? onRemoteCanvas;
  AudioEventHandler? onAudioEvent;

  bool get isConnected => _channel != null;

  Uri get _wsUri {
    final base = Uri.parse(wsBaseUrl);
    final scheme = switch (base.scheme) {
      'https' || 'wss' => 'wss',
      'http' || 'ws' => 'ws',
      _ => base.scheme,
    };
    return base.replace(scheme: scheme, path: '/ws', query: '');
  }

  /// Tek kullanıcı için WS şart değil — hata yutulur, HTTP Sokratik çalışır.
  Future<bool> connect({
    required String sessionId,
    required String userId,
  }) async {
    lastError = null;
    try {
      await disconnect();
      final uri = _wsUri;
      _channel = WebSocketChannel.connect(uri);
      await _channel!.ready.timeout(const Duration(seconds: 8));
      send({'type': 'join', 'sessionId': sessionId, 'userId': userId});

      _sub = _channel!.stream.listen(
        (event) {
          try {
            final data = jsonDecode(event as String) as Map<String, dynamic>;
            switch (data['type']) {
              case 'stroke':
                onRemoteStroke?.call(data['stroke'] as Map<String, dynamic>);
                break;
              case 'clear':
                onRemoteClear?.call();
                break;
              case 'phase':
                onRemotePhase?.call(data['phase'] as String? ?? '');
                break;
              case 'canvas_commands':
                final cmds = (data['commands'] as List<dynamic>? ?? const [])
                    .whereType<Map>()
                    .map((e) => Map<String, dynamic>.from(e))
                    .toList();
                onRemoteCanvas?.call(cmds);
                break;
              case 'audio_chunk':
              case 'speak_started':
              case 'speak_done':
              case 'speak_error':
                onAudioEvent?.call(data);
                break;
            }
          } catch (e) {
            if (kDebugMode) {
              // ignore: avoid_print
              print('[ws] message parse: $e');
            }
          }
        },
        onError: (Object e) {
          lastError = e.toString();
          if (kDebugMode) {
            // ignore: avoid_print
            print('[ws] stream error: $e');
          }
        },
        onDone: () {
          _channel = null;
        },
      );
      return true;
    } catch (e) {
      lastError = e.toString();
      _channel = null;
      if (kDebugMode) {
        // ignore: avoid_print
        print('[ws] connect failed (non-fatal): $e');
      }
      return false;
    }
  }

  void sendStroke({
    required String sessionId,
    required String colorHex,
    required double width,
    required List<Map<String, double>> points,
  }) {
    send({
      'type': 'stroke',
      'sessionId': sessionId,
      'stroke': {'color': colorHex, 'width': width, 'points': points},
    });
  }

  void sendClear(String sessionId) {
    send({'type': 'clear', 'sessionId': sessionId});
  }

  void sendPhase(String sessionId, String phase) {
    send({'type': 'phase', 'sessionId': sessionId, 'phase': phase});
  }

  void send(Map<String, dynamic> payload) {
    try {
      _channel?.sink.add(jsonEncode(payload));
    } catch (_) {}
  }

  Future<void> disconnect() async {
    await _sub?.cancel();
    try {
      await _channel?.sink.close();
    } catch (_) {}
    _sub = null;
    _channel = null;
  }
}
