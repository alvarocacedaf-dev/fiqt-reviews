'use client';

import { FormEvent, useRef, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { isUniEmail, normalizeEmail } from '@/lib/validation';

type FieldErrors = Partial<Record<'email' | 'fullName' | 'password', string>>;

export function AuthForm({ mode }: { mode: 'login' | 'register' }) {
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [message, setMessage] = useState<{ text: string; type: 'error' | 'success' } | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const submittingRef = useRef(false);
  const manualAttemptRef = useRef(0);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submittingRef.current) return;

    const form = new FormData(event.currentTarget);
    const email = normalizeEmail(form.get('email'));
    const password = String(form.get('password'));
    const fullName = mode === 'register' ? String(form.get('full_name')).trim() : '';
    const nextErrors: FieldErrors = {};

    if (mode === 'register' && fullName.length < 2) {
      nextErrors.fullName = 'Ingresa tu nombre completo.';
    }
    if (!email) {
      nextErrors.email = 'Ingresa tu correo electrónico.';
    } else if (mode === 'register' && !isUniEmail(email)) {
      nextErrors.email = 'Usa un correo institucional que termine en @uni.pe.';
    }
    if (password.length < 8) {
      nextErrors.password = 'La contraseña debe tener al menos 8 caracteres.';
    }

    if (Object.keys(nextErrors).length) {
      setFieldErrors(nextErrors);
      setMessage(null);
      return;
    }

    submittingRef.current = true;
    setLoading(true);
    setFieldErrors({});
    setMessage(null);

    const attempt = ++manualAttemptRef.current;
    if (process.env.NODE_ENV === 'development') {
      console.debug(`[auth] intento manual ${attempt}: 1 solicitud a ${mode === 'login' ? 'signInWithPassword' : 'signUp'}`);
    }

    try {
      const response = await fetch(mode === 'login' ? '/api/auth/login' : '/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          fullName: mode === 'register' ? fullName : undefined,
        }),
      });
      const result = await response.json().catch(() => ({
        error: 'No se pudo procesar la solicitud. Intenta nuevamente.',
      }));

      if (!response.ok) {
        const rateLimitMessage = mode === 'login'
          ? 'Hay demasiados intentos de inicio de sesión. Espera unos minutos antes de volver a intentarlo.'
          : 'Se alcanzó temporalmente el límite de creación de cuentas. Espera unos minutos antes de volver a intentarlo.';
        setMessage({
          text: response.status === 429 ? rateLimitMessage : result.error ?? 'No se pudo procesar la solicitud.',
          type: 'error',
        });
        return;
      }

      if (mode === 'register' && result.requiresEmailConfirmation) {
        setMessage({ text: 'Revisa tu correo UNI para confirmar la cuenta.', type: 'success' });
        return;
      }

      window.location.assign('/ciclos');
    } catch {
      setMessage({ text: 'No se pudo conectar con el servicio. Revisa tu conexión e intenta nuevamente.', type: 'error' });
    } finally {
      submittingRef.current = false;
      setLoading(false);
    }
  }

  return (
    <form className="space-y-5" noValidate onSubmit={submit}>
      {mode === 'register' && (
        <div>
          <label className="block text-sm font-semibold text-slate-700" htmlFor="auth-full-name">Nombre completo</label>
          <div className="relative mt-1.5">
            <Icon className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" name="user" />
            <input
              aria-describedby={fieldErrors.fullName ? 'auth-full-name-error' : undefined}
              aria-invalid={Boolean(fieldErrors.fullName)}
              autoComplete="name"
              className="input pl-11"
              id="auth-full-name"
              name="full_name"
              onChange={() => setFieldErrors(current => ({ ...current, fullName: undefined }))}
              required
            />
          </div>
          {fieldErrors.fullName && <p className="mt-1.5 text-xs font-semibold text-red-700" id="auth-full-name-error">{fieldErrors.fullName}</p>}
        </div>
      )}

      <div>
        <label className="block text-sm font-semibold text-slate-700" htmlFor="auth-email">
          {mode === 'register' ? 'Correo institucional UNI' : 'Correo electrónico'}
        </label>
        <div className="relative mt-1.5">
          <Icon className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" name="mail" />
          <input
            aria-describedby={fieldErrors.email ? 'auth-email-error' : undefined}
            aria-invalid={Boolean(fieldErrors.email)}
            required
            type="email"
            id="auth-email"
            name="email"
            className="input pl-11"
            autoComplete="email"
            onChange={() => setFieldErrors(current => ({ ...current, email: undefined }))}
            placeholder={mode === 'register' ? 'tu_usuario@uni.pe' : 'tu correo registrado'}
            pattern={mode === 'register' ? '^[^@\\s]+@uni\\.pe$' : undefined}
            title={mode === 'register' ? 'Usa un correo institucional que termine en @uni.pe' : 'Ingresa el correo de tu cuenta'}
          />
        </div>
        {fieldErrors.email && <p className="mt-1.5 text-xs font-semibold text-red-700" id="auth-email-error">{fieldErrors.email}</p>}
      </div>

      <div>
        <label className="block text-sm font-semibold text-slate-700" htmlFor="auth-password">Contraseña</label>
        <div className="relative mt-1.5">
          <Icon className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" name="lock" />
          <input
            aria-describedby={fieldErrors.password ? 'auth-password-error' : undefined}
            aria-invalid={Boolean(fieldErrors.password)}
            required
            minLength={8}
            type={showPassword ? 'text' : 'password'}
            id="auth-password"
            name="password"
            className="input px-11"
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            onChange={() => setFieldErrors(current => ({ ...current, password: undefined }))}
          />
          <button
            aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            className="absolute right-1.5 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-lg text-slate-500 transition hover:bg-blue-50 hover:text-royal"
            onClick={() => setShowPassword(current => !current)}
            type="button"
          >
            <Icon className="h-5 w-5" name={showPassword ? 'eye-off' : 'eye'} />
          </button>
        </div>
        {fieldErrors.password && <p className="mt-1.5 text-xs font-semibold text-red-700" id="auth-password-error">{fieldErrors.password}</p>}
      </div>

      {message && (
        <p
          className={`rounded-xl border p-3 text-sm font-semibold ${message.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-red-200 bg-red-50 text-red-800'}`}
          role={message.type === 'error' ? 'alert' : 'status'}
        >
          {message.text}
        </p>
      )}

      <button disabled={loading} className="btn-primary min-h-12 w-full text-base disabled:cursor-not-allowed disabled:opacity-60" type="submit">
        {loading ? (mode === 'login' ? 'Iniciando sesión...' : 'Creando cuenta...') : mode === 'login' ? 'Iniciar sesión' : 'Crear cuenta UNI'}
      </button>
    </form>
  );
}
