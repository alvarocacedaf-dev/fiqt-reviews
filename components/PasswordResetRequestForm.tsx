'use client';

import { useState } from 'react';

export function PasswordResetRequestForm() {
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(form: FormData) {
    setLoading(true);
    setMessage('');
    setError('');

    const email = String(form.get('email')).trim().toLowerCase();

    const response = await fetch('/api/auth/password-reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    const result = await response.json().catch(() => ({
      error: 'No se pudo procesar la solicitud. Intenta nuevamente.',
    }));

    setLoading(false);

    if (!response.ok) {
      setError(result.error ?? 'No se pudo procesar la solicitud.');
      return;
    }

    setMessage('Si el correo existe, recibirás un enlace para crear una nueva contraseña.');
  }

  return (
    <form action={submit} className="space-y-4">
      <label className="block text-sm font-semibold">
        Correo electrónico de la cuenta
        <input
          required
          type="email"
          name="email"
          className="input mt-1"
          autoComplete="email"
          placeholder="tu correo registrado"
        />
      </label>

      {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      {message && <p className="rounded-xl bg-green-50 p-3 text-sm text-green-800">{message}</p>}

      <button disabled={loading} className="btn-primary w-full">
        {loading ? 'Enviando…' : 'Enviar enlace de recuperación'}
      </button>
    </form>
  );
}
