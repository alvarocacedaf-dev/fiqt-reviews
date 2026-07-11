import Link from 'next/link';

export default function Home() {
  return (
    <section className="relative left-1/2 -mx-0 -my-8 min-h-[calc(100vh-8rem)] w-screen -translate-x-1/2 overflow-hidden border-y border-white/10 text-white">
      <div className="absolute inset-0 bg-[url('/home-campus-bg.png')] bg-cover bg-center" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#03142f]/95 via-[#061b3e]/72 to-[#061b3e]/5" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-[#020617]/35" />

      <div className="relative z-10 flex min-h-[calc(100vh-8rem)] w-full items-center px-8 py-16 sm:px-14 lg:px-24">
        <div className="max-w-2xl text-left">
          <p className="mb-5 text-xs font-black uppercase tracking-[.35em] text-gold sm:text-sm">
            Proyecto estudiantil independiente
          </p>
          <h1 className="text-4xl font-black leading-[0.98] tracking-tight drop-shadow-xl sm:text-6xl lg:text-7xl">
            Tu experiencia acad?mica tambi?n puede orientar.
          </h1>
          <p className="mt-7 max-w-xl text-base leading-8 text-blue-50 sm:text-lg">
            Plataforma de acceso para estudiantes UNI. Crea una cuenta con tu correo institucional para explorar ciclos, cursos y profesores.
          </p>

          <div className="mt-8 flex flex-col gap-4 sm:flex-row">
            <Link href="/registro" className="btn-primary bg-gold px-7 py-4 text-ink shadow-xl hover:bg-[#f4cf70]">
              Crear cuenta UNI
            </Link>
            <Link href="/login" className="btn-secondary bg-white px-7 py-4 text-primary shadow-xl hover:bg-blue-50">
              Ya tengo cuenta
            </Link>
          </div>

          <p className="mt-5 text-sm text-blue-50">
            El acceso requiere un correo que termine en <span className="font-bold text-white">@uni.pe</span>.
          </p>
        </div>
      </div>
    </section>
  );
}
