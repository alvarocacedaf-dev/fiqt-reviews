import { PasswordUpdateForm } from '@/components/PasswordUpdateForm';

export default function NuevaContrasenaPage() {
  return (
    <section className="mx-auto max-w-md panel">
      <h1 className="text-2xl font-black text-ink">Crea una nueva contraseña</h1>
      <p className="mb-6 mt-1 text-sm text-slate-600">
        Escribe tu nueva contraseña dos veces para recuperar el acceso a FIQT Reviews.
      </p>

      <PasswordUpdateForm />
    </section>
  );
}
