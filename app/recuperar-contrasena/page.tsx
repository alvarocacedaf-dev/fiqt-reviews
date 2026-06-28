import Link from 'next/link';
import { PasswordResetRequestForm } from '@/components/PasswordResetRequestForm';

export default function RecuperarContrasenaPage() {
  return (
    <section className="mx-auto max-w-md panel">
      <h1 className="text-2xl font-black text-ink">Recuperar contraseña</h1>
      <p className="mb-6 mt-1 text-sm text-slate-600">
        Escribe tu correo institucional UNI. Te enviaremos un enlace para crear una nueva contraseña.
      </p>

      <PasswordResetRequestForm />

      <p className="mt-5 text-center text-sm">
        ¿Recordaste tu contraseña? <Link className="font-bold text-royal" href="/login">Inicia sesión</Link>
      </p>
    </section>
  );
}
