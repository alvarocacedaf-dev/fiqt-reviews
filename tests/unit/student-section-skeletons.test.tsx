import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  AcademicRouteLoading,
  CoursesLoading,
  MaterialsLoading,
  ProfessorCardsLoading,
  ProfessorProfileLoading,
  ScheduleBuilderLoading,
} from '@/components/loading/StudentSectionSkeletons';

describe('esqueletos de las secciones del estudiante', () => {
  it.each([
    [AcademicRouteLoading, 'Cargando ruta académica y recompensas…'],
    [CoursesLoading, 'Cargando cursos…'],
    [ProfessorCardsLoading, 'Cargando profesores y reseñas…'],
    [MaterialsLoading, 'Cargando materiales del curso…'],
    [ProfessorProfileLoading, 'Cargando perfil y reseñas del profesor…'],
  ])('anuncia el estado de carga sin exponer los bloques decorativos', (Component, label) => {
    const { container } = render(<Component />);
    expect(screen.getByText(label)).toHaveClass('sr-only');
    expect(container.querySelector('[aria-busy="true"]')).toBeInTheDocument();
    expect(container.querySelector('[aria-hidden="true"]')).toBeInTheDocument();
  });

  it('distingue el armador del horario guardado', () => {
    const { rerender } = render(<ScheduleBuilderLoading />);
    expect(screen.getByText('Cargando armador de horarios…')).toBeInTheDocument();
    rerender(<ScheduleBuilderLoading saved />);
    expect(screen.getByText('Cargando horario guardado…')).toBeInTheDocument();
  });
});
