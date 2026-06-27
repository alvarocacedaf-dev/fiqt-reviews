import Link from 'next/link';

export default function Home() {
  return (
    <section className="py-12 text-center text-white sm:py-20">
      <p className="mb-3 text-sm font-bold uppercase tracking-[.25em] text-gold">Proyecto estudiantil independiente</p>
      <h1 className="mx-auto max-w-4xl text-4xl font-black tracking-tight sm:text-6xl">
        Tu experiencia académica también puede orientar.
      </h1>
      <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-blue-100">
        Plataforma de acceso para estudiantes UNI. Crea una cuenta con tu correo institucional para explorar ciclos, cursos y profesores.
      </p>

      <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
        <Link href="/registro" className="btn-primary bg-gold text-ink hover:bg-[#f4cf70]">
          Crear cuenta UNI
        </Link>
        <Link href="/login" className="btn-secondary">
          Ya tengo cuenta
        </Link>
      </div>

      <p className="mx-auto mt-4 max-w-xl text-sm text-blue-100">
        El acceso requiere un correo que termine en <span className="font-bold text-white">@uni.pe</span>.
      </p>

      <div className="mx-auto mt-14 grid max-w-3xl gap-4 text-left sm:grid-cols-3">
        <div className="rounded-2xl bg-white/10 p-5">
          <b>Acceso UNI</b>
          <p className="mt-1 text-sm text-blue-100">Solo cuentas registradas con correo institucional pueden explorar la página.</p>
        </div>
        <div className="rounded-2xl bg-white/10 p-5">
          <b>Moderado</b>
          <p className="mt-1 text-sm text-blue-100">Las reseñas pasan por revisión antes de publicarse.</p>
        </div>
        <div className="rounded-2xl bg-white/10 p-5">
          <b>Referencial</b>
          <p className="mt-1 text-sm text-blue-100">Información pública con fuente visible, nunca datos privados.</p>
        </div>
      </div>
    </section>
  );
}
