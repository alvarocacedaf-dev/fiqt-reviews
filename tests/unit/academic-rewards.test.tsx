import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AcademicRewards } from '@/components/academic/AcademicRewards';

const contribution = <button>Aporte a la página</button>;
const approved = { approvedReviews: 5, donatedWorksheets: 2, total: 7 };

describe('módulo de recompensas académicas', () => {
  it('distingue cinco reseñas y dos planchas sin presentarlas como siete reseñas', () => {
    render(<AcademicRewards progress={approved} status="approved" contribution={contribution} />);
    expect(screen.getByText('5 reseñas')).toBeInTheDocument();
    expect(screen.getByText('2 planchas')).toBeInTheDocument();
    expect(screen.queryByText('7 reseñas')).not.toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '7');
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuemax', '10');
    expect(screen.getByText('Te faltan 3 contribuciones aprobadas.')).toBeInTheDocument();
    expect(screen.getByText('7 contribuciones en total · Desbloqueado')).toBeInTheDocument();
  });

  it.each([null, 'pending', 'rejected'] as const)('no desbloquea beneficios sin aporte aprobado (%s)', status => {
    render(<AcademicRewards progress={approved} status={status} contribution={contribution} />);
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    expect(screen.queryByText(/· Desbloqueado/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Aporte a la página' })).toBeInTheDocument();
  });

  it('mantiene las metas basadas solo en reseñas antes del paso tres', () => {
    render(<AcademicRewards progress={{ approvedReviews: 2, donatedWorksheets: 0, total: 2 }} status="approved" contribution={contribution} />);
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuemax', '5');
    expect(screen.getByText('2 reseñas aprobadas · Desbloqueado')).toBeInTheDocument();
    expect(screen.getByText('5 reseñas aprobadas · Pendiente')).toBeInTheDocument();
  });

  it('limita la barra a la meta sin ocultar el total real', () => {
    render(<AcademicRewards progress={{ approvedReviews: 20, donatedWorksheets: 4, total: 24 }} status="approved" contribution={contribution} />);
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '18');
    expect(screen.getByText('24')).toBeInTheDocument();
    expect(screen.getByText('¡Ruta completada!')).toBeInTheDocument();
  });

  it('no convierte un error de consulta en progreso cero', () => {
    render(<AcademicRewards progress={null} status="approved" contribution={contribution} unavailable />);
    expect(screen.getByRole('status')).toHaveTextContent('No pudimos consultar tu progreso');
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });
});
