import { describe, expect, it } from 'vitest';
import { courseColors, scheduleTitle } from '@/lib/schedule/presentation';

describe('presentación consistente del horario', () => {
  it('evita la colisión entre Álgebra y Física y mantiene los colores al reordenar', () => {
    const blocks = ['BMA03', 'BFI02', 'BMA02', 'BMA03'].map(courseId => ({ courseId }));
    const colors = courseColors(blocks);
    expect(new Set(Object.values(colors)).size).toBe(3);
    expect(courseColors([...blocks].reverse())).toEqual(colors);
  });
  it('no reutiliza colores al superar la paleta inicial', () => {
    const colors = courseColors(Array.from({ length: 30 }, (_, i) => ({ courseId: String(i) })));
    expect(new Set(Object.values(colors)).size).toBe(30);
  });
  it('no inventa un número para los guardados antiguos', () => {
    expect(scheduleTitle(null)).toBe('Mi horario guardado');
    expect(scheduleTitle(2)).toBe('Horario 2');
    expect(scheduleTitle(-1)).toBe('Mi horario guardado');
  });
});
