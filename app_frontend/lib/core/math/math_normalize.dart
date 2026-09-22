/// Basit LaTeX / derece normalizasyonu — CustomPaint TextPainter için.
String normalizeMathText(String raw) {
  var s = raw.trim();
  s = s.replaceAll(RegExp(r'\$\$?'), '');
  s = s.replaceAll(r'\circ', '°');
  s = s.replaceAll('(c2circ)', '°');
  s = s.replaceAll(r'\degree', '°');
  s = s.replaceAll(r'^\circ', '°');
  s = s.replaceAllMapped(RegExp(r'\^\{?2\}?'), (_) => '²');
  s = s.replaceAllMapped(RegExp(r'\^\{?3\}?'), (_) => '³');
  s = s.replaceAll(r'\times', '×');
  s = s.replaceAll(r'\div', '÷');
  s = s.replaceAll(r'\pm', '±');
  s = s.replaceAll(r'\leq', '≤');
  s = s.replaceAll(r'\geq', '≥');
  s = s.replaceAll(r'\neq', '≠');
  s = s.replaceAll(r'\alpha', 'α');
  s = s.replaceAll(r'\beta', 'β');
  s = s.replaceAll(r'\gamma', 'γ');
  s = s.replaceAll(r'\theta', 'θ');
  s = s.replaceAll(r'\pi', 'π');
  s = s.replaceAll(r'\triangle', '△');
  s = s.replaceAll(r'\angle', '∠');
  s = s.replaceAll(RegExp(r'\\[a-zA-Z]+'), '');
  s = s.replaceAll('{', '').replaceAll('}', '');
  return s.trim();
}
