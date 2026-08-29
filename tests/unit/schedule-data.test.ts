import { describe, expect, it } from 'vitest';
import scheduleData from '@/data/schedule-2026-2.json';
import type { CourseSection } from '@/lib/schedule/types';

const sections = scheduleData.sections as CourseSection[];

describe('carga horaria oficial 2026-2', () => {
  it('contiene la cobertura completa del archivo oficial', () => {
    expect(new Set(sections.map((section) => section.courseId)).size).toBe(105);
    expect(sections).toHaveLength(212);
    expect(sections.flatMap((section) => section.blocks)).toHaveLength(472);
  });

  it('incluye las secciones añadidas por el horario oficial', () => {
    expect(sections.find((section) => section.id === 'BFI02-D')?.blocks).toHaveLength(3);
    expect(sections.find((section) => section.id === 'BMA01-D')?.blocks).toHaveLength(3);
    expect(sections.find((section) => section.id === 'PI721-B')?.blocks).toHaveLength(2);
  });

  it('mantiene los códigos canónicos del catálogo de la aplicación', () => {
    const courseIds = new Set(sections.map((section) => section.courseId));
    expect(courseIds.has('BIC01')).toBe(true);
    expect(courseIds.has('EP818')).toBe(true);
    expect(courseIds.has('PA515')).toBe(true);
    expect(courseIds.has('BICO1')).toBe(false);
    expect(courseIds.has('EP518')).toBe(false);
    expect(courseIds.has('PA515(*)')).toBe(false);
  });

  it('combina práctica y laboratorio simultáneos en un único bloque', () => {
    const section = sections.find((candidate) => candidate.id === 'BFI02-D');
    const combined = section?.blocks.find((block) => block.startTime === '17:00');
    expect(combined?.type).toBe('Práctica / Laboratorio');
    expect(section?.blocks.filter((block) => block.startTime === '17:00')).toHaveLength(1);
  });

  it('no conserva bloques oficiales duplicados o solapados dentro de una sección', () => {
    const section = sections.find((candidate) => candidate.id === 'PI136-A');
    expect(section?.blocks.map((block) => [block.startTime, block.endTime, block.type])).toEqual([
      ['08:00', '09:00', 'Teoría'],
      ['09:00', '12:00', 'Práctica / Laboratorio'],
    ]);
  });
});
