import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ProfessorCard } from '@/components/ProfessorCard';

const professor = {
  id: 'professor-1',
  full_name: 'Docente de prueba',
  photo_url: null,
  source_name: 'DIRCE UNI',
  source_url: null,
  is_active: true,
};

describe('señales inequívocas de interacción', () => {
  it('mantiene la tarjeta del profesor informativa y deja visibles sus acciones reales', () => {
    const { container } = render(
      <ProfessorCard
        courseId="course-1"
        courseName="Curso de prueba"
        hasReviewAccess
        professor={professor}
      />,
    );

    const card = container.querySelector('article');
    expect(card).not.toHaveClass('group');
    expect(card?.className).not.toContain('hover:-translate');
    expect(screen.getByRole('link', { name: 'Ver perfil' })).toBeVisible();
    expect(screen.getByRole('link', { name: 'Crear reseña' })).toBeVisible();
  });
});
