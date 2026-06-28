'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export function PasswordUpdateForm() {
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const db = createClient();

    async function prepareRecoverySession() {
      setError('');

      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');

      if (code) {
        const { error: exchangeError } = await db.auth.exchangeCodeForSession(code);
        if (exchangeError) {
          setError('El enlace de recuperación expiró o no es válido. Solicita un nuevo enlace.');
          setReady(true);
          return;
        }

        window.history.replaceState({}, document.title, window.location.pathname);
      }

      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
      const accessToken = hash.get('access_token');
      const refreshToken = hash.get('refresh_token');

      if (accessToken && refreshToken) {
        const { error: sessionError } = await db.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken
        });

        if (sessionError) {
          setError('El enlace de recuperación expiró o no es válido. Solicita un nuevo enlace.');
          setReady(true);
          return;
        }

        window.history.replaceState({}, document.title, window.location.pathname);
      }

      const { data } = await db.auth.getSession();

      if (!data.session) {
        setError('No encontramos una sesión de recuperación activa. Solicita un nuevo enlace desde “Me olvidé mi contraseña”.');
      }

      setReady(true);
    }

    prepareRecoverySession();
  }, []);

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
    const { data } = await db.auth.getSession();

    if (!data.session) {
      setLoading(false);
      setError('No encontramos una sesión de recuperación activa. Solicita un nuevo enlace desde “Me olvidé mi contraseña”.');
      return;
    }

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
          disabled={!ready}
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
          disabled={!ready}
        />
      </label>

      {!ready && <p className="rounded-xl bg-blue-50 p-3 text-sm text-blue-800">Validando enlace de recuperación…</p>}
      {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      {message && <p className="rounded-xl bg-green-50 p-3 text-sm text-green-800">{message}</p>}

      <button disabled={loading || !ready} className="btn-primary w-full">
        {loading ? 'Actualizando…' : 'Actualizar contraseña'}
      </button>
    </form>
  );
}
