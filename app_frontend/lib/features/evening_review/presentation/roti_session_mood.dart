import 'package:sanal_ogretmen/core/branding/roti_mood.dart';
import 'package:sanal_ogretmen/features/evening_review/providers/evening_review_provider.dart';

RotiMood rotiMoodFromSession(EveningReviewState state) {
  if (state.errorMessage != null) return RotiMood.oops;
  if (state.guidingQuestion != null) return RotiMood.thinking;
  switch (state.phase) {
    case SessionPhase.listening:
      return RotiMood.listening;
    case SessionPhase.tutorSpeaking:
      return RotiMood.speaking;
    case SessionPhase.drawing:
      return RotiMood.drawing;
    case SessionPhase.socratic:
      return RotiMood.thinking;
    case SessionPhase.busy:
      return RotiMood.thinking;
    case SessionPhase.error:
      return RotiMood.oops;
    case SessionPhase.idle:
      return state.dueMistakes.isNotEmpty
          ? RotiMood.encourage
          : RotiMood.idle;
  }
}
