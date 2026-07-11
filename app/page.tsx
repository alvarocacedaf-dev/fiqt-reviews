import Link from 'next/link';

const featureCards = [
  {
    title: 'Acceso UNI',
    text: 'Solo cuentas registradas con correo institucional pueden explorar la página.',
    icon: 'lock',
  },
  {
    title: 'Moderado',
    text: 'Las reseñas pasan por revisión antes de publicarse.',
    icon: 'shield',
  },
  {
    title: 'Referencial',
    text: 'Información pública con fuente visible, nunca datos privados.',
    icon: 'eye',
  },
];

function FeatureIcon({ type }: { type: string }) {
  if (type === 'lock') {
    return (
      <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M7 11V8a5 5 0 0 1 10 0v3" />
        <rect x="5" y="11" width="14" height="10" rx="2" />
      </svg>
    );
  }

  if (type === 'shield') {
    return (
      <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M12 3 19 6v5c0 5-3.1 8.5-7 10-3.9-1.5-7-5-7-10V6l7-3Z" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export default function Home() {
  return (
    <section className="relative left-1/2 -mx-0 -my-8 w-screen -translate-x-1/2 overflow-hidden border-y border-white/10 text-white">
      <div className="relative min-h-[460px] overflow-hidden sm:min-h-[500px] lg:min-h-[520px]">
        <div className="absolute inset-0 bg-[url('/home-campus-bg.png')] bg-cover bg-center" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#03142f]/98 via-[#061b3e]/78 to-[#061b3e]/8" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-[#020617]/45" />

        <div className="relative z-10 flex min-h-[460px] w-full items-center px-8 py-14 sm:min-h-[500px] sm:px-14 lg:min-h-[520px] lg:px-24">
          <div className="max-w-2xl text-left">
            <p className="mb-5 text-xs font-black uppercase tracking-[.35em] text-gold sm:text-sm">
              Proyecto estudiantil independiente
            </p>
            <h1 className="text-4xl font-black leading-[1.02] tracking-tight drop-shadow-xl sm:text-5xl lg:text-6xl">
              Tu experiencia académica también puede orientar.
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
      </div>

      <div className="bg-[#03142f] px-6 py-7 sm:px-10 lg:px-16">
        <div className="mx-auto grid max-w-5xl gap-5 md:grid-cols-3">
          {featureCards.map((card) => (
            <article key={card.title} className="flex items-center gap-5 rounded-xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary/35 text-blue-100">
                <FeatureIcon type={card.icon} />
              </div>
              <div>
                <h2 className="text-lg font-black">{card.title}</h2>
                <p className="mt-2 text-sm leading-6 text-blue-100">{card.text}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
