import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:sanal_ogretmen/core/theme/app_theme.dart';
import 'package:url_launcher/url_launcher.dart';

class VideoSuggestion {
  const VideoSuggestion({
    required this.title,
    required this.youtubeId,
    required this.startSeconds,
    required this.embedUrl,
    required this.watchUrl,
    required this.headline,
    this.outcomeCode,
  });

  final String title;
  final String youtubeId;
  final int startSeconds;
  final String embedUrl;
  final String watchUrl;
  final String headline;
  final String? outcomeCode;

  factory VideoSuggestion.fromJson(Map<String, dynamic> json) {
    return VideoSuggestion(
      title: json['title'] as String? ?? 'Video özeti',
      youtubeId: json['youtubeId'] as String? ?? '',
      startSeconds: (json['startSeconds'] as num?)?.toInt() ?? 0,
      embedUrl: json['embedUrl'] as String? ?? '',
      watchUrl: json['watchUrl'] as String? ?? '',
      headline: json['headline'] as String? ??
          'Anlamadıysan 2 dakikalık nokta atışı video özeti:',
      outcomeCode: json['outcomeCode'] as String?,
    );
  }
}

/// MEB koduna bağlı YouTube timestamp kartı
class CuratedVideoCard extends StatelessWidget {
  const CuratedVideoCard({super.key, required this.video});

  final VideoSuggestion video;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      margin: const EdgeInsets.only(top: 8, bottom: 4),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: const Color(0xFF1A2238),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: RotixColors.neon.withOpacity(0.35)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            video.headline,
            style: GoogleFonts.nunito(
              color: RotixColors.neon,
              fontWeight: FontWeight.w800,
              fontSize: 13,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            video.title,
            style: GoogleFonts.nunito(
              color: RotixColors.textPrimary,
              fontWeight: FontWeight.w700,
              fontSize: 15,
            ),
          ),
          if (video.outcomeCode != null) ...[
            const SizedBox(height: 4),
            Text(
              'MEB: ${video.outcomeCode}',
              style: GoogleFonts.nunito(
                color: RotixColors.textMuted,
                fontSize: 11,
              ),
            ),
          ],
          const SizedBox(height: 10),
          FilledButton.icon(
            style: FilledButton.styleFrom(
              backgroundColor: RotixColors.neon,
              foregroundColor: Colors.black,
            ),
            onPressed: () async {
              final uri = Uri.tryParse(video.watchUrl);
              if (uri != null) {
                await launchUrl(uri, mode: LaunchMode.externalApplication);
              }
            },
            icon: const Icon(Icons.play_circle_filled_rounded),
            label: Text(
              'Videoyu aç (${video.startSeconds}s)',
              style: GoogleFonts.nunito(fontWeight: FontWeight.w800),
            ),
          ),
        ],
      ),
    );
  }
}
