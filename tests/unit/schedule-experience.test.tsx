import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ScheduleExplorer } from '@/components/schedule/ScheduleExplorer';
import { GeneratedScheduleList } from '@/components/schedule/GeneratedScheduleList';
import { SavedSchedule } from '@/components/schedule/SavedSchedule';
import { generateScheduleCombinations } from '@/lib/schedule/generator';
import type { CourseSection } from '@/lib/schedule/types';

const section: CourseSection = {
  id: 'MAT-A', courseId: 'MAT', courseName: 'Matemática completa', section: 'A',
  department: 'TEST', professors: ['Docente'],
  blocks: [
    { id: 'a', courseId: 'MAT', courseName: 'Matemática completa', section: 'A', day: 'Lunes', startTime: '08:00', endTime: '10:00', type: 'Teoría' },
    { id: 'b', courseId: 'MAT', courseName: 'Matemática completa', section: 'A', day: 'Lunes', startTime: '11:00', endTime: '12:00', type: 'Práctica' },
  ],
};
const first = generateScheduleCombinations([[section]]).schedules[0];
const second = { ...first, id: 'second' };

beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true })));
});

describe('experiencia del horario', () => {
  it('presenta día completo, huecos y días sin clases', () => {
    render(<ScheduleExplorer schedule={first} />);
    fireEvent.click(screen.getByRole('button', { name: 'Día' }));
    expect(screen.queryByText('Selecciona una clase para ver sus detalles.')).not.toBeInTheDocument();
    expect(screen.getByText('60 min libres entre clases')).toBeInTheDocument();
    expect(screen.getAllByText('Matemática completa')).toHaveLength(2);
    fireEvent.click(screen.getByRole('button', { name: 'Domingo' }));
    expect(screen.getByText(/No tienes clases este día/)).toBeInTheDocument();
  });
  it('comparar no guarda, guardar reemplaza la única elección', () => {
    render(<GeneratedScheduleList schedules={[first, second]} truncated={false} />);
    fireEvent.click(screen.getByRole('button', { name: /Horario 2/ }));
    expect(localStorage.getItem('fiqt-reviews-saved-schedule')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Guardar en este navegador' }));
    expect(JSON.parse(localStorage.getItem('fiqt-reviews-saved-schedule')!).schedule.id).toBe('second');
    expect(JSON.parse(localStorage.getItem('fiqt-reviews-saved-schedule')!).position).toBe(2);
    fireEvent.click(screen.getByRole('button', { name: /Horario 1/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Guardar en este navegador' }));
    expect(JSON.parse(localStorage.getItem('fiqt-reviews-saved-schedule')!).schedule.id).toBe(first.id);
    expect(screen.getAllByRole('button', { name: 'Horario guardado' })).toHaveLength(1);
  });
  it('informa cuando no se puede guardar', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('denied'); });
    render(<GeneratedScheduleList schedules={[first]} truncated={false} />);
    fireEvent.click(screen.getByRole('button', { name: 'Guardar en este navegador' }));
    expect(screen.getByRole('status')).toHaveTextContent('No se pudo guardar');
  });
  it('lee el formato de guardado anterior y abre consulta diaria en móvil', () => {
    localStorage.setItem('fiqt-reviews-saved-schedule', JSON.stringify({ academicTerm: '2026-2', schedule: first }));
    render(<SavedSchedule />);
    expect(screen.getByText('Tu horario guardado')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Mi horario guardado' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Horario 1' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Día' })).toHaveAttribute('aria-pressed', 'true');
  });
  it('tolera datos corruptos sin borrar el guardado', () => {
    localStorage.setItem('fiqt-reviews-saved-schedule', '{bad');
    render(<SavedSchedule />);
    expect(screen.getByRole('status')).toHaveTextContent('No se pudo acceder');
    expect(localStorage.getItem('fiqt-reviews-saved-schedule')).toBe('{bad');
  });
  it('conserva el número del horario al abrirlo y volver a guardarlo', () => {
    localStorage.setItem('fiqt-reviews-saved-schedule', JSON.stringify({ academicTerm: '2026-2', schedule: second, position: 2 }));
    render(<SavedSchedule />);
    expect(screen.getByRole('heading', { name: 'Horario 2' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Horario guardado' }));
    expect(JSON.parse(localStorage.getItem('fiqt-reviews-saved-schedule')!).position).toBe(2);
  });
});
