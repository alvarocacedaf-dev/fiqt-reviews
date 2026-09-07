const STRICT_EXAM_TYPES = new Set(['practice', 'midterm', 'final', 'substitute']);

function normalize(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\.[a-z0-9]+$/i, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

export function worksheetFileFormat(examType: string, courseName: string, academicTerm: string) {
  const term = academicTerm.trim() || '[ciclo académico]';
  const optional = ' — [sección, profesor, parte o solucionario opcional]';
  if (examType === 'practice') return `Práctica calificada [número] de ${courseName} ${term}${optional}`;
  if (examType === 'midterm') return `Examen parcial de ${courseName} ${term}${optional}`;
  if (examType === 'final') return `Examen final de ${courseName} ${term}${optional}`;
  if (examType === 'substitute') return `Examen sustitutorio de ${courseName} ${term}${optional}`;
  return null;
}

export function validateWorksheetFileName({
  fileName,
  examType,
  courseName,
  courseCode,
  academicTerm,
}: {
  fileName: string;
  examType: string;
  courseName: string;
  courseCode?: string | null;
  academicTerm: string;
}) {
  return canonicalizeWorksheetFileName({ fileName, examType, courseName, courseCode, academicTerm }).error;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function courseAliases(courseName: string, courseCode?: string | null) {
  const canonical = normalize(courseName);
  const romanValues: Record<string, string> = { i: '1', ii: '2', iii: '3', iv: '4', v: '5', vi: '6' };
  const numeric = canonical.split(' ').map(part => romanValues[part] ?? part).join(' ');
  const aliases = new Set([canonical, numeric]);
  if (courseCode) aliases.add(normalize(courseCode));
  const shorthand: [RegExp, string][] = [
    [/^matematicas?\b/, 'mate'], [/^fisicoquimica\b/, 'fiqui'], [/^programacion\b/, 'progra'],
    [/^quimica inorganica\b/, 'inorganica'], [/^analisis quimico\b/, 'analisis'],
    [/^calculo integral\b/, 'integral'], [/^calculo diferencial\b/, 'diferencial'],
  ];
  for (const [pattern, replacement] of shorthand) {
    if (pattern.test(numeric)) aliases.add(numeric.replace(pattern, replacement));
  }
  return aliases;
}

export function canonicalizeWorksheetFileName({
  fileName,
  examType,
  courseName,
  courseCode,
  academicTerm,
}: {
  fileName: string;
  examType: string;
  courseName: string;
  courseCode?: string | null;
  academicTerm: string;
}): { title: string | null; error: string | null } {
  if (!STRICT_EXAM_TYPES.has(examType)) return { title: null, error: null };
  if (!academicTerm.trim()) return { title: null, error: 'Ingresa el ciclo académico antes de seleccionar los archivos.' };

  const actual = normalize(fileName);
  const term = normalize(academicTerm);
  const termPattern = escapeRegExp(term);
  const patterns: Record<string, RegExp> = {
    practice: new RegExp(`^(?:practica(?: calificada)?|pc)\\s+(\\d+)\\s+de\\s+(.+?)\\s+${termPattern}(?:\\s+.*)?$`),
    midterm: new RegExp(`^(?:examen\\s+)?(?:parcial|ep)\\s+de\\s+(.+?)\\s+${termPattern}(?:\\s+.*)?$`),
    final: new RegExp(`^(?:examen\\s+)?(?:final|ef)\\s+de\\s+(.+?)\\s+${termPattern}(?:\\s+.*)?$`),
    substitute: new RegExp(`^(?:examen\\s+)?(?:sustitutorio|susti|sustitutorio|es)\\s+de\\s+(.+?)\\s+${termPattern}(?:\\s+.*)?$`),
  };
  const match = actual.match(patterns[examType]);
  const courseToken = match?.[examType === 'practice' ? 2 : 1];
  if (!match || !courseToken || !courseAliases(courseName, courseCode).has(courseToken)) {
    return { title: null, error: `El archivo debe llamarse: “${worksheetFileFormat(examType, courseName, academicTerm)}”. También se acepta el código oficial del curso y abreviaturas como PC o Susti.` };
  }

  const rawStem = fileName.replace(/\.[a-z0-9]{2,5}$/i, '').replace(/_compressed$/i, '').trim();
  const rawTerm = rawStem.match(/\b(?:19|20)\d{2}\s*[-–_ ]\s*(?:[0-3]|I{1,3})\b/i);
  const extra = rawTerm ? rawStem.slice((rawTerm.index ?? 0) + rawTerm[0].length).replace(/^[\s—–,:;-]+/, '').trim() : '';
  const base = examType === 'practice'
    ? `Práctica calificada ${match[1]} de ${courseName} ${academicTerm.trim()}`
    : `${examType === 'midterm' ? 'Examen parcial' : examType === 'final' ? 'Examen final' : 'Examen sustitutorio'} de ${courseName} ${academicTerm.trim()}`;
  const title = extra ? `${base} — ${extra}` : base;
  if (title.length > 160) return { title: null, error: 'El nombre normalizado supera el máximo de 160 caracteres.' };
  return { title, error: null };
}
