export function worksheetUploadErrorMessage({
  error,
  fileName,
  title,
}: {
  error: unknown;
  fileName: string;
  title: string;
}) {
  const detail = error instanceof Error ? error.message : 'No se pudo completar la carga.';
  if (/plancha\b[\s\S]*ya ha sido subida/i.test(detail)) {
    return `La plancha “${title}” ya ha sido subida. Archivo seleccionado: “${fileName}”.`;
  }
  return `No se pudo subir “${fileName}”: ${detail}`;
}
