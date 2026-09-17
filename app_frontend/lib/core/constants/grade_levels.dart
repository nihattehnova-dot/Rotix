/// Grade bands drive voice tone, UI density, and Socratic tempo.
enum PedagogicalBand {
  primary, // 1–4: warm, encouraging, visual cues
  middle, // 5–7
  examLgs, // 8: disciplined LGS pace
  high, // 9–11
  examYks, // 12: YKS-focused
}

PedagogicalBand bandForGrade(int grade) {
  assert(grade >= 1 && grade <= 12);
  if (grade <= 4) return PedagogicalBand.primary;
  if (grade <= 7) return PedagogicalBand.middle;
  if (grade == 8) return PedagogicalBand.examLgs;
  if (grade <= 11) return PedagogicalBand.high;
  return PedagogicalBand.examYks;
}

String bandLabelTr(PedagogicalBand band) {
  switch (band) {
    case PedagogicalBand.primary:
      return 'İlkokul · Teşvikçi';
    case PedagogicalBand.middle:
      return 'Ortaokul · Keşif';
    case PedagogicalBand.examLgs:
      return 'LGS · Disiplinli tempo';
    case PedagogicalBand.high:
      return 'Lise · Analitik';
    case PedagogicalBand.examYks:
      return 'YKS · Sınav odaklı';
  }
}

String gradeLabelTr(int grade) => '$grade. Sınıf';
