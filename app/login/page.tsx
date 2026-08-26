import Link from 'next/link';
import { AccessShell } from '@/components/AccessShell';
import { AuthForm } from '@/components/AuthForm';

export default function Login() {
  return (
    <AccessShell
      description="Ingresa con tu correo institucional UNI para explorar ciclos, cursos y profesores."
      footer={(
        <div className="space-y-3">
          <p>¿No tienes cuenta? <Link className="font-bold text-royal transition hover:text-ink" href="/registro">Regístrate</Link></p>
          <p><Link className="font-bold text-royal transition hover:text-ink" href="/recuperar-contrasena">Me olvidé mi contraseña</Link></p>
        </div>
      )}
      mode="login"
      title="Bienvenido de vuelta"
    >
      <AuthForm mode="login" />
    </AccessShell>
  );
}
