import { describe, expect, it } from 'vitest';
import {
  calculateAttendanceDays,
  calculateConflictMinutes,
  calculateGaps,
  detectConflicts,
  generateScheduleCombinations,
  getTopSchedules,
} from '@/lib/schedule/generator';
import type { ClassBlock, CourseSection, Day, GeneratedSchedule } from '@/lib/schedule/types';

function block(id: string, courseId: string, day: Day, startTime: string, endTime: string): ClassBlock {
  return { id, courseId, courseName: courseId, section: 'A', professorName: 'Docente', day, startTime, endTime, type: 'Teoría' };
}

function section(courseId: string, sectionName: string, blocks: ClassBlock[]): CourseSection {
  return { id: `${courseId}-${sectionName}`, courseId, courseName: courseId, section: sectionName, department: 'TEST', professors: ['Docente'], blocks };
}

describe('schedule generator', () => {
  it('detecta el solapamiento real y no considera como cruce dos clases consecutivas', () => {
    const blocks = [
      block('a', 'FIS', 'Lunes', '08:00', '10:00'),
      block('b', 'MAT', 'Lunes', '09:00', '11:00'),
      block('c', 'QUI', 'Lunes', '11:00', '12:00'),
    ];
    const conflicts = detectConflicts(blocks);

    expect(conflicts).toHaveLength(1);
    expect(conflicts[0]).toMatchObject({ day: 'Lunes', startTime: '09:00', endTime: '10:00', minutes: 60 });
    expect(calculateConflictMinutes(conflicts)).toBe(60);
  });

  it('calcula huecos sin contar tiempo solapado y cuenta días únicos', () => {
    const blocks = [
      block('a', 'FIS', 'Lunes', '08:00', '10:00'),
      block('b', 'MAT', 'Lunes', '11:00', '12:00'),
      block('c', 'QUI', 'Martes', '09:00', '11:00'),
    ];

    expect(calculateGaps(blocks)).toBe(60);
    expect(calculateAttendanceDays(blocks)).toBe(2);
  });

  it('elige primero una combinación sin cruces y devuelve como máximo tres opciones', () => {
    const physicsA = section('FIS', 'A', [block('fis-a', 'FIS', 'Lunes', '08:00', '10:00')]);
    const mathA = section('MAT', 'A', [block('mat-a', 'MAT', 'Lunes', '09:00', '11:00')]);
    const mathB = section('MAT', 'B', [block('mat-b', 'MAT', 'Martes', '09:00', '11:00')]);

    const result = generateScheduleCombinations([[physicsA], [mathA, mathB]]);

    expect(result.schedules).toHaveLength(2);
    expect(result.schedules[0].conflictCount).toBe(0);
    expect(result.schedules[0].sections.map((item) => item.id)).toContain('MAT-B');
  });

  it('ordena lexicográficamente por cruces antes que por huecos', () => {
    const base = { sections: [], blocks: [], conflicts: [], conflictMinutes: 0, attendanceDays: 1, distributionMinutes: 0, score: 0 };
    const schedules = [
      { ...base, id: 'sin-cruce', conflictCount: 0, gapMinutes: 600 },
      { ...base, id: 'con-cruce', conflictCount: 1, gapMinutes: 0 },
    ] as GeneratedSchedule[];

    expect(getTopSchedules(schedules)[0].id).toBe('sin-cruce');
  });

  it('limita la exploración con beam search cuando hay demasiadas combinaciones', () => {
    const groups = Array.from({ length: 5 }, (_, groupIndex) => Array.from({ length: 4 }, (_, sectionIndex) => {
      const courseId = `C${groupIndex}`;
      return section(courseId, String(sectionIndex), [block(`${courseId}-${sectionIndex}`, courseId, 'Lunes', `${String(8 + sectionIndex).padStart(2, '0')}:00`, `${String(9 + sectionIndex).padStart(2, '0')}:00`)]);
    }));

    const result = generateScheduleCombinations(groups, 20);
    expect(result.truncated).toBe(true);
    expect(result.schedules.length).toBeLessThanOrEqual(3);
  });
});
