import 'dart:async';
import 'dart:convert';

import 'package:web_socket_channel/web_socket_channel.dart';

typedef RemoteStrokeHandler = void Function(Map<String, dynamic> stroke);
typedef RemoteClearHandler = void Function();
typedef RemotePhaseHandler = void Function(String phase);
typedef RemoteCanvasHandler = void Function(List<Map<String, dynamic>> commands);

class WhiteboardWsClient {
  WhiteboardWsClient({required this.wsBaseUrl});

  final String wsBaseUrl;
  WebSocketChannel? _channel;
  StreamSubscription? _sub;

  RemoteStrokeHandler? onRemoteStroke;
  RemoteClearHandler? onRemoteClear;
  RemotePhaseHandler? onRemotePhase;
  RemoteCanvasHandler? onRemoteCanvas;

  bool get isConnected => _channel != null;

  Future<void> connect({
    required String sessionId,
    required String userId,
  }) async {
    await disconnect();
    final uri = Uri.parse('$wsBaseUrl/ws');
    _channel = WebSocketChannel.connect(uri);
    send({'type': 'join', 'sessionId': sessionId, 'userId': userId});

    _sub = _channel!.stream.listen((event) {
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
      }
    });
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
    _channel?.sink.add(jsonEncode(payload));
  }

  Future<void> disconnect() async {
    await _sub?.cancel();
    await _channel?.sink.close();
    _sub = null;
    _channel = null;
  }
}
