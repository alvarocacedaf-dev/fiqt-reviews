const STRICT_EXAM_TYPES = new Set(['practice', 'midterm', 'final', 'substitute']);

function academicTermFromFileName(fileName: string) {
  const match = fileName
    .replace(/\.[a-z0-9]{2,5}$/i, '')
    .match(/\b((?:19|20)?\d{2})\s*[-–_ ]\s*([0-3]|I{1,3})\b/i);
  if (!match) return '';
  const year = match[1].length === 2 ? `20${match[1]}` : match[1];
  const period = ({ I: '1', II: '2', III: '3' } as Record<string, string>)[match[2].toUpperCase()] ?? match[2];
  return `${year}-${period}`;
}

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
}): { title: string | null; error: string | null; academicTerm?: string } {
  if (!STRICT_EXAM_TYPES.has(examType)) return { title: null, error: null, academicTerm: academicTerm.trim() };
  const resolvedAcademicTerm = academicTerm.trim() || academicTermFromFileName(fileName);
  if (!resolvedAcademicTerm) return { title: null, error: `No se pudo identificar el ciclo académico de “${fileName}”. Inclúyelo en el nombre (por ejemplo, 2025-1) o escríbelo en el campo Ciclo académico.` };

  const actual = normalize(fileName);
  const term = normalize(resolvedAcademicTerm);
  const shortTerm = term.replace(/^20(?=\d{2}\s)/, '');
  const termPattern = shortTerm === term
    ? escapeRegExp(term)
    : `(?:${escapeRegExp(term)}|${escapeRegExp(shortTerm)})`;
  const aliases = [...courseAliases(courseName, courseCode)].sort((left, right) => right.length - left.length);
  const aliasPattern = aliases.map(escapeRegExp).join('|');
  const patterns: Record<string, RegExp> = {
    practice: new RegExp(`^(?:practica(?: calificada)?|pc)\\s+(\\d+)\\s+de\\s+(.+?)\\s+${termPattern}(?:\\s+.*)?$`),
    midterm: new RegExp(`^(?:examen\\s+)?(?:parcial|ep)\\s+de\\s+(.+?)\\s+${termPattern}(?:\\s+.*)?$`),
    final: new RegExp(`^(?:examen\\s+)?(?:final|ef)\\s+de\\s+(.+?)\\s+${termPattern}(?:\\s+.*)?$`),
    substitute: new RegExp(`^(?:examen\\s+)?(?:sustitutorio|susti|sustitutorio|es)\\s+de\\s+(.+?)\\s+${termPattern}(?:\\s+.*)?$`),
  };
  const prefixedPatterns: Record<string, RegExp> = {
    practice: new RegExp(`^${termPattern}\\s+(?:practica(?: calificada)?|pc)\\s+(\\d+)(?:\\s+(.*?))?\\s+(${aliasPattern})$`),
    midterm: new RegExp(`^${termPattern}\\s+(?:examen\\s+)?(?:parcial|ep)(?:\\s+(.*?))?\\s+(${aliasPattern})$`),
    final: new RegExp(`^${termPattern}\\s+(?:examen\\s+)?(?:final|ef)(?:\\s+(.*?))?\\s+(${aliasPattern})$`),
    substitute: new RegExp(`^${termPattern}\\s+(?:examen\\s+)?(?:sustitutorio|susti|es)(?:\\s+(.*?))?\\s+(${aliasPattern})$`),
  };
  const regularMatch = actual.match(patterns[examType]);
  const prefixedMatch = actual.match(prefixedPatterns[examType]);
  const courseToken = regularMatch?.[examType === 'practice' ? 2 : 1]
    ?? prefixedMatch?.[examType === 'practice' ? 3 : 2];
  if ((!regularMatch && !prefixedMatch) || !courseToken || !courseAliases(courseName, courseCode).has(courseToken)) {
    return { title: null, error: `El archivo debe llamarse: “${worksheetFileFormat(examType, courseName, resolvedAcademicTerm)}”. También se acepta el ciclo al inicio, el código oficial del curso y abreviaturas como PC o Susti.` };
  }

  const rawStem = fileName.replace(/\.[a-z0-9]{2,5}$/i, '').replace(/_compressed$/i, '').trim();
  const rawTerm = rawStem.match(/\b(?:19|20)\d{2}\s*[-–_ ]\s*(?:[0-3]|I{1,3})\b/i);
  const regularExtra = rawTerm ? rawStem.slice((rawTerm.index ?? 0) + rawTerm[0].length).replace(/^[\s—–,:;-]+/, '').trim() : '';
  const prefixedExtra = prefixedMatch?.[examType === 'practice' ? 2 : 1]?.trim() ?? '';
  const extra = prefixedMatch ? prefixedExtra : regularExtra;
  const practiceNumber = regularMatch?.[1] ?? prefixedMatch?.[1];
  const base = examType === 'practice'
    ? `Práctica calificada ${practiceNumber} de ${courseName} ${resolvedAcademicTerm}`
    : `${examType === 'midterm' ? 'Examen parcial' : examType === 'final' ? 'Examen final' : 'Examen sustitutorio'} de ${courseName} ${resolvedAcademicTerm}`;
  const title = extra ? `${base} — ${extra}` : base;
  if (title.length > 160) return { title: null, error: 'El nombre normalizado supera el máximo de 160 caracteres.', academicTerm: resolvedAcademicTerm };
  return { title, error: null, academicTerm: resolvedAcademicTerm };
}
