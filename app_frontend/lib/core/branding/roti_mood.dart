/// Local mascot moods — zero API cost.
enum RotiMood {
  idle,
  welcome,
  listening,
  speaking,
  thinking,
  drawing,
  celebrate,
  encourage,
  oops,
}

extension RotiMoodCopy on RotiMood {
  String get bubble {
    switch (this) {
      case RotiMood.idle:
        return 'Hazırım! Ne çalışalım?';
      case RotiMood.welcome:
        return 'Merhaba! Ben Roti ✨';
      case RotiMood.listening:
        return 'Seni dinliyorum…';
      case RotiMood.speaking:
        return 'Anlatıyorum, dikkat!';
      case RotiMood.thinking:
        return 'Hmm… birlikte düşünelim';
      case RotiMood.drawing:
        return 'Tahtaya çiziyorum!';
      case RotiMood.celebrate:
        return 'Harika! Süper iş!';
      case RotiMood.encourage:
        return 'Sen yapabilirsin, yanındayım';
      case RotiMood.oops:
        return 'Olur böyle şeyler — tekrar deneyelim';
    }
  }

  double get bounceScale {
    switch (this) {
      case RotiMood.celebrate:
        return 1.08;
      case RotiMood.speaking:
      case RotiMood.listening:
        return 1.04;
      case RotiMood.oops:
        return 0.96;
      default:
        return 1.0;
    }
  }
}
