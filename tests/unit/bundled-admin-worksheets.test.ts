import { describe, expect, it } from 'vitest';
import { resolveBundledAdminWorksheets } from '@/lib/bundledAdminWorksheets';
import { compareAssessmentWorksheetFiles } from '@/lib/worksheetSorting';

describe('planchas incluidas con la aplicación', () => {
  it('asocia la práctica combinada con PI140', () => {
    const [worksheet] = resolveBundledAdminWorksheets([
      { id: 'course-pi140', code: 'PI140' },
      { id: 'course-bma02', code: 'BMA02' },
    ]);

    expect(worksheet).toMatchObject({
      course_id: 'course-pi140',
      exam_type: 'practice',
      academic_term: '2024-3',
      title: 'Práctica calificada 1 y 2 de Fenómenos de Transporte 2024-3 — Emma A. Alvarez Núñez',
      storage_provider: 'public',
    });
  });

  it('queda entre las prácticas de 2024-2 y 2025-1', () => {
    const [combined] = resolveBundledAdminWorksheets([{ id: 'course-pi140', code: 'PI140' }]);
    const files = [
      { ...combined, title: 'Práctica calificada 1 de Fenómenos de Transporte 2025-1', academic_term: '2025-1' },
      combined,
      { ...combined, title: 'Práctica calificada 1 de Fenómenos de Transporte 2024-2', academic_term: '2024-2' },
    ].sort(compareAssessmentWorksheetFiles);

    expect(files.map(file => file.academic_term)).toEqual(['2024-2', '2024-3', '2025-1']);
  });
});
