import { describe, expect, it } from 'vitest';
import { laboratoryGuideForCourse } from '@/lib/courseLaboratoryGuides';

describe('guías de laboratorio por curso', () => {
  it.each(['BQU01', 'BQU02', 'QU216', 'QU427', 'QU518', 'QU428', 'QU328', 'QU338'])(
    'reserva una guía para %s',
    courseCode => {
      expect(laboratoryGuideForCourse(courseCode)).toBeNull();
    },
  );

  it('no muestra la acción en cursos sin guía de laboratorio', () => {
    expect(laboratoryGuideForCourse('BMA02')).toBeUndefined();
    expect(laboratoryGuideForCourse()).toBeUndefined();
  });
});
