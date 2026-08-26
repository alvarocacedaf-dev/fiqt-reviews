import Link from 'next/link';

export function Footer() {
  return (
    <footer className="border-t border-white/10 bg-[#03112a] px-5 py-10 text-blue-100 sm:px-6">
      <div className="mx-auto grid max-w-6xl gap-8 md:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.65fr)] md:gap-12">
        <section>
          <p className="text-xl font-extrabold tracking-tight text-white">
            FIQT <span className="text-gold">Reviews<span className="text-white">/</span>Planchas</span>
          </p>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-blue-100/85">
            Un espacio estudiantil independiente para compartir experiencias académicas responsables y orientar a la
            comunidad de Ingeniería Química y Textil.
          </p>

          <div className="mt-6 grid gap-4 border-t border-white/10 pt-5 sm:grid-cols-2">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-gold">Aviso institucional</p>
              <p className="mt-2 text-xs leading-5 text-blue-100/75">
                Este proyecto no pertenece ni representa oficialmente a la Universidad Nacional de Ingeniería.
              </p>
            </div>
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-gold">Convivencia</p>
              <p className="mt-2 text-xs leading-5 text-blue-100/75">
                Las reseñas pasan por moderación. No se permiten insultos, acusaciones personales ni contenido
                discriminatorio.
              </p>
            </div>
          </div>
        </section>

        <section className="flex flex-col justify-between rounded-2xl border border-white/10 bg-white/[0.04] p-5">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-gold">Explora</p>
            <nav className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm font-semibold" aria-label="Enlaces del pie de página">
              <Link className="transition hover:text-gold" href="/ciclos">Ciclos</Link>
              <Link className="transition hover:text-gold" href="/verificacion">Verificación</Link>
              <Link className="transition hover:text-gold" href="/planchas">Planchas</Link>
              <Link className="transition hover:text-gold" href="/mis-matches">Mis matches</Link>
            </nav>
          </div>

          <div className="mt-7 flex items-end justify-between gap-4 border-t border-white/10 pt-4">
            <p className="text-[11px] leading-4 text-blue-100/60">Proyecto desarrollado para la comunidad FIQT.</p>
            <img
              src="/arc-farfan-signature.png"
              alt="Firma ARC Farfan"
              className="h-auto w-24 shrink-0 select-none opacity-90 sm:w-28"
            />
          </div>
        </section>
      </div>
    </footer>
  );
}
