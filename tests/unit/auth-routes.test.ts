// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  assertAnonymousLimit: vi.fn(),
  clearAnonymousLimit: vi.fn(),
  consumeAnonymousLimit: vi.fn(),
  getAuthRateSubjects: vi.fn(() => ['email-hash', 'ip-hash']),
  signUp: vi.fn(),
  signInWithPassword: vi.fn(),
  resetPasswordForEmail: vi.fn(),
}));

vi.mock('@/lib/authRateLimit', () => ({
  assertAnonymousLimit: mocks.assertAnonymousLimit,
  clearAnonymousLimit: mocks.clearAnonymousLimit,
  consumeAnonymousLimit: mocks.consumeAnonymousLimit,
  getAuthRateSubjects: mocks.getAuthRateSubjects,
  isRateLimitError: () => false,
  rateLimitResponse: (message: string) => Response.json({ error: message }, { status: 429 }),
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    auth: {
      signUp: mocks.signUp,
      signInWithPassword: mocks.signInWithPassword,
      resetPasswordForEmail: mocks.resetPasswordForEmail,
    },
  })),
}));

import { POST as register } from '@/app/api/auth/register/route';
import { POST as login } from '@/app/api/auth/login/route';
import { POST as resetPassword } from '@/app/api/auth/password-reset/route';

function jsonRequest(path: string, body: Record<string, unknown>) {
  return new Request(`http://localhost${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.signUp.mockResolvedValue({ data: { session: null }, error: null });
  mocks.signInWithPassword.mockResolvedValue({ error: null });
  mocks.resetPasswordForEmail.mockResolvedValue({ error: null });
});

describe('POST /api/auth/register', () => {
  it('rechaza dominios que intentan imitar a uni.pe antes de llamar a Supabase', async () => {
    const response = await register(jsonRequest('/api/auth/register', {
      email: 'alumno@uni.pe.example.com',
      password: 'segura123',
      fullName: 'Alumno Prueba',
    }));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'Usa tu correo institucional @uni.pe.' });
    expect(mocks.consumeAnonymousLimit).not.toHaveBeenCalled();
    expect(mocks.signUp).not.toHaveBeenCalled();
  });

  it('normaliza y registra una cuenta institucional', async () => {
    const response = await register(jsonRequest('/api/auth/register', {
      email: '  ALUMNO@UNI.PE ',
      password: 'segura123',
      fullName: ' Alumno Prueba ',
    }));

    expect(response.status).toBe(200);
    expect(mocks.consumeAnonymousLimit).toHaveBeenCalledWith('registration', ['email-hash', 'ip-hash']);
    expect(mocks.signUp).toHaveBeenCalledWith(expect.objectContaining({
      email: 'alumno@uni.pe',
      password: 'segura123',
      options: expect.objectContaining({ data: { full_name: 'Alumno Prueba' } }),
    }));
    expect(await response.json()).toEqual({ ok: true, requiresEmailConfirmation: true });
  });
});

describe('POST /api/auth/login', () => {
  it('rechaza credenciales incompletas sin consumir límites', async () => {
    const response = await login(jsonRequest('/api/auth/login', { email: '', password: '' }));
    expect(response.status).toBe(400);
    expect(mocks.assertAnonymousLimit).not.toHaveBeenCalled();
  });

  it('limpia solamente el límite del correo después de un inicio correcto', async () => {
    const response = await login(jsonRequest('/api/auth/login', {
      email: 'alumno@uni.pe',
      password: 'segura123',
    }));

    expect(response.status).toBe(200);
    expect(mocks.clearAnonymousLimit).toHaveBeenCalledWith('login_failure', ['email-hash']);
  });

  it('devuelve un mensaje genérico y registra el intento cuando Supabase rechaza la clave', async () => {
    mocks.signInWithPassword.mockResolvedValueOnce({ error: new Error('invalid credentials') });
    const response = await login(jsonRequest('/api/auth/login', {
      email: 'alumno@uni.pe',
      password: 'incorrecta',
    }));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'Correo o contraseña incorrectos.' });
    expect(mocks.consumeAnonymousLimit).toHaveBeenCalledWith('login_failure', ['email-hash', 'ip-hash']);
  });
});

describe('POST /api/auth/password-reset', () => {
  it('no consulta Supabase cuando falta el correo', async () => {
    const response = await resetPassword(jsonRequest('/api/auth/password-reset', { email: '' }));
    expect(response.status).toBe(400);
    expect(mocks.resetPasswordForEmail).not.toHaveBeenCalled();
  });

  it('genera el retorno hacia la pantalla de contraseña nueva', async () => {
    const response = await resetPassword(jsonRequest('/api/auth/password-reset', {
      email: 'alumno@uni.pe',
    }));

    expect(response.status).toBe(200);
    expect(mocks.resetPasswordForEmail).toHaveBeenCalledWith(
      'alumno@uni.pe',
      { redirectTo: 'http://localhost/recuperar-contrasena/nueva' },
    );
  });
});
