import { describe, expect, it } from 'vitest';
import { worksheetArchiveDisposition, worksheetArchiveName, worksheetDownloadName } from '@/lib/worksheetArchiveName';

describe('nombre de las carpetas ZIP de planchas', () => {
  it('combina el nombre visible de la carpeta y el curso', () => {
    expect(worksheetArchiveName('midterm', 'Tópicos Especiales en Física'))
      .toBe('Exámenes parciales de Tópicos Especiales en Física.zip');
  });

  it('elimina caracteres que Windows no admite en nombres de archivo', () => {
    expect(worksheetArchiveName('practice', 'Química: teoría / laboratorio'))
      .toBe('Prácticas calificadas de Química teoría laboratorio.zip');
  });

  it('incluye una versión UTF-8 para conservar las tildes al descargar', () => {
    const fileName = 'Exámenes parciales de Tópicos Especiales en Física.zip';
    const disposition = worksheetArchiveDisposition(fileName);

    expect(disposition).toContain('filename="Examenes parciales de Topicos Especiales en Fisica.zip"');
    expect(disposition).toContain("filename*=UTF-8''Ex%C3%A1menes%20parciales%20de%20T%C3%B3picos%20Especiales%20en%20F%C3%ADsica.zip");
  });

  it('usa el título normalizado visible y conserva la extensión del original', () => {
    expect(worksheetDownloadName(
      'Práctica calificada 1 de Métodos Numéricos para Ingeniería Química 2023-1 — PILCO',
      'PC1-metodos-pilco.DOCX',
    )).toBe('Práctica calificada 1 de Métodos Numéricos para Ingeniería Química 2023-1 — PILCO.docx');
  });

  it('no duplica una extensión que ya forma parte del título', () => {
    expect(worksheetDownloadName('Examen final 2024-2.pdf', 'archivo-original.pdf'))
      .toBe('Examen final 2024-2.pdf');
  });
});
