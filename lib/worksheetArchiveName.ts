const CATEGORY_NAMES: Record<string, string> = {
  practice: 'Prácticas calificadas',
  midterm: 'Exámenes parciales',
  final: 'Exámenes finales',
  substitute: 'Exámenes sustitutorios',
  quiz: 'Controles o pasos',
  other: 'Otros materiales',
};

export function worksheetArchiveName(examType: string, courseName: string) {
  const categoryName = CATEGORY_NAMES[examType] || 'Archivos';
  const safeCourseName = courseName
    .replace(/[\u0000-\u001f<>:"/\\|?*]/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/[. ]+$/g, '')
    .trim() || 'curso';

  return `${categoryName} de ${safeCourseName}.zip`;
}

export function worksheetArchiveDisposition(fileName: string) {
  const asciiName = fileName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7E]/g, '_')
    .replace(/["\\]/g, '_');

  return `attachment; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(fileName)}`;
}

export function worksheetDownloadName(title: string, storedFileName: string) {
  const cleanTitle = title.replace(/[\r\n]/g, ' ').replace(/\s+/g, ' ').trim() || 'Plancha';
  const extension = storedFileName.match(/\.[A-Za-z0-9]{1,10}$/)?.[0]?.toLocaleLowerCase() ?? '';
  if (!extension || cleanTitle.toLocaleLowerCase().endsWith(extension)) return cleanTitle;
  return `${cleanTitle}${extension}`;
}
