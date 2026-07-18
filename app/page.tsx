import Link from 'next/link';

const featureCards = [
  {
    title: 'Acceso UNI',
    text: 'Solo cuentas registradas con correo institucional pueden explorar la página.',
  },
  {
    title: 'Moderado',
    text: 'Las reseñas pasan por revisión antes de publicarse.',
  },
  {
    title: 'Referencial',
    text: 'Información pública con fuente visible, nunca datos privados.',
  },
];

export default function Home() {
  return (
    <section className="relative left-1/2 -mx-0 -my-8 flex w-screen flex-1 -translate-x-1/2 flex-col overflow-hidden border-t border-white/10 text-white">
      <div className="relative min-h-[460px] flex-1 overflow-hidden sm:min-h-[500px] lg:min-h-[520px]">
        <div className="absolute inset-0 translate-x-[4%] scale-110 bg-[url('/home-campus-bg.png')] bg-cover bg-center" />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(2,6,23,0.98)_0%,rgba(3,20,47,0.96)_28%,rgba(3,20,47,0.74)_43%,rgba(3,20,47,0.28)_58%,rgba(3,20,47,0.06)_74%,rgba(3,20,47,0)_100%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(2,6,23,0.05)_0%,rgba(2,6,23,0.08)_58%,rgba(2,6,23,0.42)_100%)]" />

        <div className="relative z-10 flex h-full min-h-[460px] w-full items-center px-8 py-14 sm:min-h-[500px] sm:px-14 lg:min-h-[520px] lg:px-24">
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
        <div className="mx-auto grid max-w-4xl gap-4 md:grid-cols-3">
          {featureCards.map((card) => (
            <article key={card.title} className="rounded-xl bg-white/10 p-5 text-left shadow-2xl backdrop-blur">
              <h2 className="text-base font-black text-white">{card.title}</h2>
              <p className="mt-2 text-sm leading-6 text-blue-100">{card.text}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
