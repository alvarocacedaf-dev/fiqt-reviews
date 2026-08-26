import Link from 'next/link';
import { AccessShell } from '@/components/AccessShell';
import { AuthForm } from '@/components/AuthForm';

export default function Register() {
  return (
    <AccessShell
      description="Para acceder necesitas un correo institucional que termine en @uni.pe."
      footer={(
        <p>¿Ya tienes cuenta? <Link className="font-bold text-royal transition hover:text-ink" href="/login">Inicia sesión</Link></p>
      )}
      mode="register"
      title="Crea tu cuenta UNI"
    >
      <AuthForm mode="register" />
    </AccessShell>
  );
}
