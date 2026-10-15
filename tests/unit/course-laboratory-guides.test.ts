import { describe, expect, it } from 'vitest';
import { laboratoryGuideForCourse } from '@/lib/courseLaboratoryGuides';

describe('guías de laboratorio por curso', () => {
  it.each(['BQU01', 'BQU02', 'QU216', 'QU427', 'QU518', 'QU338'])(
    'reserva una guía para %s',
    courseCode => {
      expect(laboratoryGuideForCourse(courseCode)).toBeNull();
    },
  );

  it('conecta la guía disponible de Química Orgánica I', () => {
    expect(laboratoryGuideForCourse('QU328')).toBe('/guias-laboratorio/QU328-quimica-organica-i.pdf');
  });

  it('conecta la guía disponible de Fisicoquímica II', () => {
    expect(laboratoryGuideForCourse('QU428')).toBe('/guias-laboratorio/QU428-fisicoquimica-ii.pdf');
  });

  it('no muestra la acción en cursos sin guía de laboratorio', () => {
    expect(laboratoryGuideForCourse('BMA02')).toBeUndefined();
    expect(laboratoryGuideForCourse()).toBeUndefined();
  });
});
