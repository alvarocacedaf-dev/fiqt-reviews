import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

  it('permite mostrar y ocultar la contraseña', async () => {
    const user = userEvent.setup();
    render(<AuthForm mode="login" />);
    const password = screen.getByLabelText('Contraseña');

    expect(password).toHaveAttribute('type', 'password');
    await user.click(screen.getByRole('button', { name: 'Mostrar contraseña' }));
    expect(password).toHaveAttribute('type', 'text');
    await user.click(screen.getByRole('button', { name: 'Ocultar contraseña' }));
    expect(password).toHaveAttribute('type', 'password');
  });

  it('muestra la validación junto a cada campo incompleto', async () => {
    const user = userEvent.setup();
    render(<AuthForm mode="register" />);

    await user.click(screen.getByRole('button', { name: 'Crear cuenta UNI' }));

    expect(screen.getByText('Ingresa tu nombre completo.')).toBeVisible();
    expect(screen.getByText('Ingresa tu correo electrónico.')).toBeVisible();
    expect(screen.getByText('La contraseña debe tener al menos 8 caracteres.')).toBeVisible();
    expect(screen.getByLabelText('Correo institucional UNI')).toHaveAttribute('aria-invalid', 'true');
  });
});
