import { describe, expect, it } from 'vitest';
import { worksheetUploadErrorMessage } from '@/lib/worksheetUploadError';

describe('mensajes de error al subir planchas', () => {
  it('identifica el título y el archivo seleccionado cuando ya existe', () => {
    const message = worksheetUploadErrorMessage({
      error: new Error('Esta plancha ya ha sido subida.'),
      fileName: 'PRACTICA CALIFICADA 3 PI524 2025-2.pdf',
      title: 'Práctica calificada 3 de Métodos Numéricos para Ingeniería Química 2025-2',
    });

    expect(message).toBe(
      'La plancha “Práctica calificada 3 de Métodos Numéricos para Ingeniería Química 2025-2” ya ha sido subida. Archivo seleccionado: “PRACTICA CALIFICADA 3 PI524 2025-2.pdf”.',
    );
  });

  it('incluye el archivo concreto en otros errores de carga', () => {
    expect(worksheetUploadErrorMessage({
      error: new Error('El almacenamiento rechazó la confirmación.'),
      fileName: 'examen.pdf',
      title: 'Examen parcial',
    })).toBe('No se pudo subir “examen.pdf”: El almacenamiento rechazó la confirmación.');
  });
});
