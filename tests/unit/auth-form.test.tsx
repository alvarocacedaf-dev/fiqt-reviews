import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AuthForm } from '@/components/AuthForm';

describe('AuthForm', () => {
  it('configura restricciones institucionales en el formulario de registro', () => {
    render(<AuthForm mode="register" />);

    expect(screen.getByLabelText('Nombre completo')).toBeRequired();
    expect(screen.getByLabelText('Correo institucional UNI')).toHaveAttribute(
      'pattern',
      String.raw`^[^@\s]+@uni\.pe$`,
    );
    expect(screen.getByLabelText('Contraseña')).toHaveAttribute('minlength', '8');
    expect(screen.getByRole('button', { name: 'Crear cuenta UNI' })).toBeEnabled();
  });

  it('usa autocompletado de credenciales existentes al iniciar sesión', () => {
    render(<AuthForm mode="login" />);
    expect(screen.getByLabelText('Correo electrónico')).toHaveAttribute('autocomplete', 'email');
    expect(screen.getByLabelText('Contraseña')).toHaveAttribute('autocomplete', 'current-password');
  });
});
