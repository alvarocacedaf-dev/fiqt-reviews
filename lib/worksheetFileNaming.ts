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
  if (examType === 'practice') return `Práctica calificada [número] de ${courseName} ${term}`;
  if (examType === 'midterm') return `Examen parcial de ${courseName} ${term}`;
  if (examType === 'final') return `Examen final de ${courseName} ${term}`;
  if (examType === 'substitute') return `Examen sustitutorio de ${courseName} ${term}`;
  return null;
}

export function validateWorksheetFileName({
  fileName,
  examType,
  courseName,
  academicTerm,
}: {
  fileName: string;
  examType: string;
  courseName: string;
  academicTerm: string;
}) {
  if (!STRICT_EXAM_TYPES.has(examType)) return null;
  if (!academicTerm.trim()) return 'Ingresa el ciclo académico antes de seleccionar los archivos.';

  const actual = normalize(fileName);
  const course = normalize(courseName);
  const term = normalize(academicTerm);
  const prefix = examType === 'practice'
    ? 'practica calificada '
    : examType === 'midterm'
      ? 'examen parcial de '
      : examType === 'final'
        ? 'examen final de '
        : 'examen sustitutorio de ';

  const valid = examType === 'practice'
    ? new RegExp(`^${prefix}\\d+ de ${escapeRegExp(course)} ${escapeRegExp(term)}$`).test(actual)
    : actual === `${prefix}${course} ${term}`;

  if (valid) return null;
  return `El archivo debe llamarse: “${worksheetFileFormat(examType, courseName, academicTerm)}”.`;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
