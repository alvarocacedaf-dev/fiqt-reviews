import Link from 'next/link';
import { AuthForm } from '@/components/AuthForm';

export default function Register() {
  return (
    <section className="mx-auto max-w-md panel">
      <h1 className="text-2xl font-black text-ink">Crea tu cuenta UNI</h1>
      <p className="mb-6 mt-1 text-sm text-slate-600">
        Para acceder a FIQT Reviews necesitas un correo institucional que termine en @uni.pe.
      </p>
      <AuthForm mode="register" />
      <p className="mt-5 text-center text-sm">
        ¿Ya tienes cuenta? <Link className="font-bold text-royal" href="/login">Inicia sesión</Link>
      </p>
    </section>
  );
}
