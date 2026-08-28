type WorksheetSortEntry = {
  title: string;
  file_name: string;
  academic_term: string | null;
  created_at: string;
};

const naturalSpanishCollator = new Intl.Collator('es', {
  numeric: true,
  sensitivity: 'base',
});

const ORDINAL_ASSESSMENT_NUMBERS: Record<string, number> = {
  primera: 1,
  primer: 1,
  segunda: 2,
  segundo: 2,
  tercera: 3,
  tercer: 3,
  cuarta: 4,
  cuarto: 4,
  quinta: 5,
  quinto: 5,
};

function searchableName(file: WorksheetSortEntry) {
  return `${file.title} ${file.file_name}`.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function assessmentNumber(file: WorksheetSortEntry) {
  const name = searchableName(file).trim();
  const numeric = name.match(/^(\d+)\b/);
  if (numeric) return Number(numeric[1]);

  for (const [word, value] of Object.entries(ORDINAL_ASSESSMENT_NUMBERS)) {
    if (new RegExp(`\\b${word}\\b`).test(name)) return value;
  }
  return Number.MAX_SAFE_INTEGER;
}

function academicTerm(file: WorksheetSortEntry) {
  const explicitTerm = file.academic_term?.match(/\b(20\d{2})\s*[-–]\s*([123])\b/);
  const inferredTerm = searchableName(file).match(/\b(20\d{2})\s*[-–]\s*([123])\b/);
  const match = explicitTerm ?? inferredTerm;
  return match ? Number(`${match[1]}${match[2]}`) : Number.MAX_SAFE_INTEGER;
}

function solutionNumber(file: WorksheetSortEntry) {
  const name = searchableName(file);
  const solution = name.match(/\bsoluci(?:on|onario)\s*(\d+)?/);
  if (!solution) return 0;
  return solution[1] ? Number(solution[1]) : 1;
}

export function compareAssessmentWorksheetFiles(left: WorksheetSortEntry, right: WorksheetSortEntry) {
  return assessmentNumber(left) - assessmentNumber(right)
    || academicTerm(left) - academicTerm(right)
    || solutionNumber(left) - solutionNumber(right)
    || naturalSpanishCollator.compare(left.title, right.title)
    || naturalSpanishCollator.compare(left.file_name, right.file_name)
    || left.created_at.localeCompare(right.created_at);
}

export function compareWorksheetTitles(left: WorksheetSortEntry, right: WorksheetSortEntry) {
  return naturalSpanishCollator.compare(left.title, right.title)
    || naturalSpanishCollator.compare(left.file_name, right.file_name)
    || left.created_at.localeCompare(right.created_at);
}
