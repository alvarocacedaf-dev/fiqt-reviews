'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export function PasswordUpdateForm() {
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(form: FormData) {
    setLoading(true);
    setError('');
    setMessage('');

    const password = String(form.get('password'));
    const confirmPassword = String(form.get('confirm_password'));

    if (password.length < 8) {
      setLoading(false);
      setError('La nueva contraseña debe tener al menos 8 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      setLoading(false);
      setError('Las contraseñas no coinciden.');
      return;
    }

    const db = createClient();
    const { error: updateError } = await db.auth.updateUser({ password });

    setLoading(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setMessage('Tu contraseña fue actualizada. Ahora puedes iniciar sesión.');

    await db.auth.signOut();
    window.setTimeout(() => {
      window.location.assign('/login');
    }, 1200);
  }

  return (
    <form action={submit} className="space-y-4">
      <label className="block text-sm font-semibold">
        Nueva contraseña
        <input
          required
          minLength={8}
          type="password"
          name="password"
          className="input mt-1"
          autoComplete="new-password"
        />
      </label>

      <label className="block text-sm font-semibold">
        Repite la nueva contraseña
        <input
          required
          minLength={8}
          type="password"
          name="confirm_password"
          className="input mt-1"
          autoComplete="new-password"
        />
      </label>

      {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      {message && <p className="rounded-xl bg-green-50 p-3 text-sm text-green-800">{message}</p>}

      <button disabled={loading} className="btn-primary w-full">
        {loading ? 'Actualizando…' : 'Actualizar contraseña'}
      </button>
    </form>
  );
}
