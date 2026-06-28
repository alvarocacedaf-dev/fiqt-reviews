'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

const UNI_EMAIL_DOMAIN = '@uni.pe';

export function PasswordResetRequestForm() {
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(form: FormData) {
    setLoading(true);
    setMessage('');
    setError('');

    const email = String(form.get('email')).trim().toLowerCase();

    if (!email.endsWith(UNI_EMAIL_DOMAIN)) {
      setLoading(false);
      setError('Usa tu correo institucional UNI que termine en @uni.pe.');
      return;
    }

    const db = createClient();
    const { error: resetError } = await db.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/recuperar-contrasena/nueva`
    });

    setLoading(false);

    if (resetError) {
      setError(resetError.message);
      return;
    }

    setMessage('Si el correo existe, recibirás un enlace para crear una nueva contraseña.');
  }

  return (
    <form action={submit} className="space-y-4">
      <label className="block text-sm font-semibold">
        Correo institucional UNI
        <input
          required
          type="email"
          name="email"
          className="input mt-1"
          autoComplete="email"
          placeholder="tu_usuario@uni.pe"
          pattern="^[^@\s]+@uni\.pe$"
          title="Usa un correo institucional que termine en @uni.pe"
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
