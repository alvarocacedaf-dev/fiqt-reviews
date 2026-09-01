import { describe, expect, it } from 'vitest';
import { courseProfessorCatalog } from '@/lib/professorCatalog';

describe('catálogo de profesores', () => {
  it('asocia EC618 con Carbajal Gutiérrez y no conserva la transcripción Carabali', () => {
    const ec618 = courseProfessorCatalog.find(entry => entry.courseCode === 'EC618');

    expect(ec618?.professors).toContain('Carbajal Gutiérrez, Félix');
    expect(ec618?.professors).not.toContain('Carabali Gutiérrez, Félix');
  });
});
