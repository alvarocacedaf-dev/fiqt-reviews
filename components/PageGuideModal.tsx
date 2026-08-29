'use client';

import { useEffect, useRef, useState } from 'react';
import { Icon, type IconName } from '@/components/ui/Icon';

const GUIDE_ITEMS: { icon: IconName; title: string; description: string }[] = [
  {
    icon: 'academic',
    title: 'Explora la ruta académica',
    description: 'El Ciclo 1 tiene activas todas las funciones de Materiales del curso y Reseñas de los profesores. En los demás ciclos, estas funciones se habilitarán mediante Tu ruta de recompensas.',
  },
  {
    icon: 'verification',
    title: 'Verifica tus cursos',
    description: 'En la opción de Verificación, registra los cursos que ya has llevado anteriormente. Estos serán los cursos que se te permitirá reseñar, junto con su respectivo profesor, lo que te ayudará a avanzar en Tu ruta de recompensas.',
  },
  {
    icon: 'star',
    title: 'Comparte una reseña responsable',
    description: 'Una vez que envíes tus cursos para verificación y sean aprobados, aparecerán en la sección Cursos verificados y podrás comenzar a reseñarlos. Todas las reseñas pasan por moderación antes de ser aprobadas y publicadas; por ello, ten en cuenta que una reseña con mensajes ofensivos o insultos hacia un profesor no será aprobada.',
  },
  {
    icon: 'unlock',
    title: 'Tu ruta de recompensas',
    description: 'A través de esta ruta se te irán habilitando las diferentes funciones de la página. El inicio de tu ruta es el aporte indicado en esa sección; después de realizarlo, la ruta se irá completando con tus reseñas. Este aporte permite que la página pueda almacenar los diferentes archivos de planchas y materiales de estudio. Actualmente, la página ya cuenta con más de 1000 planchas y más de 500 materiales de estudio por curso, y se espera que durante esta primera semana de lanzamiento se terminen de cargar 1000 archivos adicionales. Ten en cuenta que Tu ruta de recompensas volverá a cero en cada ciclo y que las recompensas también se actualizarán.',
  },
  {
    icon: 'calendar',
    title: 'Arma tu horario',
    description: 'Selecciona tus cursos y compara hasta tres combinaciones priorizadas por cruces, huecos y días de asistencia.',
  },
  {
    icon: 'library',
    title: 'Consulta materiales y planchas',
    description: 'Encuentra archivos organizados por curso y categoría cuando tengas habilitado el beneficio correspondiente.',
  },
  {
    icon: 'users',
    title: 'Participa en la comunidad',
    description: 'Usa los matches y chats de forma respetuosa para intercambiar material con otros estudiantes.',
  },
];

export function PageGuideModal() {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
      triggerRef.current?.focus();
    };
  }, [open]);

  return (
    <>
      <button
        className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:border-gold hover:bg-gold hover:text-ink"
        onClick={() => setOpen(true)}
        ref={triggerRef}
        type="button"
      >
        <Icon className="h-5 w-5" name="library" />
        Guía para utilizar la página
      </button>

      {open && (
        <div
          aria-labelledby="page-guide-title"
          aria-modal="true"
          className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-slate-950/75 p-4 backdrop-blur-sm sm:p-6"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setOpen(false);
          }}
          role="dialog"
        >
          <section className="relative my-auto max-h-[min(860px,calc(100dvh-2rem))] w-full max-w-3xl overflow-y-auto rounded-[1.75rem] border border-white/20 bg-slate-50 shadow-2xl">
            <header className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-200 bg-white/95 px-5 py-5 backdrop-blur sm:px-7">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.22em] text-royal">FIQT Reviews</p>
                <h2 className="mt-1 text-2xl font-black text-ink sm:text-3xl" id="page-guide-title">Guía para utilizar la página</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">Un recorrido rápido por las herramientas disponibles.</p>
              </div>
              <button
                aria-label="Cerrar guía"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-700 transition hover:border-royal hover:text-royal focus:outline-none focus:ring-2 focus:ring-royal"
                onClick={() => setOpen(false)}
                ref={closeRef}
                type="button"
              >
                <Icon className="h-5 w-5" name="close" />
              </button>
            </header>

            <div className="p-5 sm:p-7">
              <div className="grid gap-3 sm:grid-cols-2">
                {GUIDE_ITEMS.map((item, index) => (
                  <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm" key={item.title}>
                    <div className="flex items-start gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-royal">
                        <Icon className="h-5 w-5" name={item.icon} />
                      </span>
                      <div>
                        <p className="text-[11px] font-black uppercase tracking-wider text-amber-600">Paso {index + 1}</p>
                        <h3 className="mt-1 font-black text-ink">{item.title}</h3>
                        <p className="mt-1.5 text-sm leading-6 text-slate-600">{item.description}</p>
                      </div>
                    </div>
                  </article>
                ))}
              </div>

              <div className="mt-5 rounded-2xl bg-[#071a3d] p-5 text-white">
                <p className="font-black">Recuerda</p>
                <p className="mt-1 text-sm leading-6 text-blue-100">FIQT Reviews es una comunidad estudiantil. Comparte información académica real, protege tus datos personales y mantén siempre una comunicación respetuosa.</p>
              </div>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
