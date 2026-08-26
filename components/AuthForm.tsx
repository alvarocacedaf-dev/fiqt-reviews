'use client';

import { useState } from 'react';
import { isUniEmail, normalizeEmail } from '@/lib/validation';

export function AuthForm({ mode }: { mode: 'login' | 'register' }) {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(form: FormData) {
    setLoading(true);
    setError('');

    const email = normalizeEmail(form.get('email'));
    const password = String(form.get('password'));

    if (mode === 'register' && !isUniEmail(email)) {
      setLoading(false);
      setError('Para crear una cuenta de estudiante debes usar un correo institucional que termine en @uni.pe.');
      return;
    }

    const response = await fetch(mode === 'login' ? '/api/auth/login' : '/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        password,
        fullName: mode === 'register' ? String(form.get('full_name')).trim() : undefined,
      }),
    });
    const result = await response.json().catch(() => ({
      error: 'No se pudo procesar la solicitud. Intenta nuevamente.',
    }));

    setLoading(false);

    if (!response.ok) return setError(result.error ?? 'No se pudo procesar la solicitud.');

    if (mode === 'register' && result.requiresEmailConfirmation) {
      setError('Revisa tu correo UNI para confirmar la cuenta.');
      return;
    }

    window.location.assign('/ciclos');
  }

  return (
    <form action={submit} className="space-y-4">
      {mode === 'register' && (
        <label className="block text-sm font-semibold">
          Nombre completo
          <input required name="full_name" className="input mt-1" />
        </label>
      )}

      <label className="block text-sm font-semibold">
        {mode === 'register' ? 'Correo institucional UNI' : 'Correo electrónico'}
        <input
          required
          type="email"
          name="email"
          className="input mt-1"
          autoComplete="email"
          placeholder={mode === 'register' ? 'tu_usuario@uni.pe' : 'tu correo registrado'}
          pattern={mode === 'register' ? '^[^@\\s]+@uni\\.pe$' : undefined}
          title={mode === 'register' ? 'Usa un correo institucional que termine en @uni.pe' : 'Ingresa el correo de tu cuenta'}
        />
      </label>

      <label className="block text-sm font-semibold">
        Contraseña
        <input
          required
          minLength={8}
          type="password"
          name="password"
          className="input mt-1"
          autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
        />
      </label>

      {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p>}

      <button disabled={loading} className="btn-primary w-full">
        {loading ? 'Procesando…' : mode === 'login' ? 'Iniciar sesión' : 'Crear cuenta UNI'}
      </button>
    </form>
  );
}
