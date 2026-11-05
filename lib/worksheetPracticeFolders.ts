type PracticeFile = { title: string; file_name: string };

export function practiceFolderNumber(file: PracticeFile): number | null {
  for (const value of [file.title, file.file_name]) {
    const text = value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const numeric = text.match(/\b(?:practica\s+calificada|practica|pc)[\s._-]*(?:n(?:ro|umero)?[.°º\s-]*)?0?([1-7])\b/);
    if (numeric) return Number(numeric[1]);
    const ordinal = text.match(/\b(primera|segunda|tercera|cuarta|quinta|sexta|septima)\s+practica\b/);
    if (ordinal) return ['primera','segunda','tercera','cuarta','quinta','sexta','septima'].indexOf(ordinal[1]) + 1;
  }
  return null;
}

export function practiceFolderLabel(number: number | null) {
  return number === null ? 'Prácticas sin número identificado' : 'Práctica calificada ' + number;
}

export function groupPracticeFiles<T extends PracticeFile>(files: T[]) {
  const groups = new Map<number | null, T[]>();
  for (const file of files) {
    const number = practiceFolderNumber(file);
    groups.set(number, [...(groups.get(number) ?? []), file]);
  }
  return [...groups.entries()].sort(([a], [b]) => (a ?? 99) - (b ?? 99))
    .map(([number, files]) => ({ number, label: practiceFolderLabel(number), files }));
}
