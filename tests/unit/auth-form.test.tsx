import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AuthForm } from '@/components/AuthForm';

describe('AuthForm', () => {
  afterEach(() => vi.unstubAllGlobals());
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

  it.each([
    { mode: 'login' as const, emailLabel: 'Correo electrónico', button: 'Iniciar sesión', pending: 'Iniciando sesión...' },
    { mode: 'register' as const, emailLabel: 'Correo institucional UNI', button: 'Crear cuenta UNI', pending: 'Creando cuenta...' },
  ])('envía una sola solicitud ante doble submit rápido en $mode', ({ mode, emailLabel, button, pending }) => {
    const fetchMock = vi.fn(() => new Promise<Response>(() => undefined));
    vi.stubGlobal('fetch', fetchMock);
    render(<AuthForm mode={mode} />);

    if (mode === 'register') {
      fireEvent.change(screen.getByLabelText('Nombre completo'), { target: { value: 'Alumno Prueba' } });
    }
    fireEvent.change(screen.getByLabelText(emailLabel), { target: { value: 'alumno@uni.pe' } });
    fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'segura123' } });
    const form = screen.getByRole('button', { name: button }).closest('form');
    expect(form).not.toBeNull();
    fireEvent.submit(form!);
    fireEvent.submit(form!);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: pending })).toBeDisabled();
  });
});
