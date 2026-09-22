/** Sunucu tarafı derece / LaTeX sadeleştirme */
export function normalizeMathDisplay(raw: string): string {
  return raw
    .replace(/\$\$?/g, '')
    .replace(/\^\\circ/g, '°')
    .replace(/\\circ/g, '°')
    .replace(/\(c2circ\)/gi, '°')
    .replace(/\^\{?2\}?/g, '²')
    .replace(/\\times/g, '×')
    .replace(/\\triangle/g, '△')
    .replace(/\\angle/g, '∠')
    .trim();
}
