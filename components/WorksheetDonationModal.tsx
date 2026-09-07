'use client';

import { useEffect, useRef, useState } from 'react';
import { AdminWorksheetUploadForm } from '@/components/AdminWorksheetLibraryManager';
import { Icon } from '@/components/ui/Icon';

type CourseOption = { id: string; code: string | null; name: string };

export function WorksheetDonationModal({ courses }: { courses: CourseOption[] }) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => event.key === 'Escape' && setOpen(false);
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
        aria-disabled="true"
        className="inline-flex cursor-not-allowed items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-bold text-white/60 shadow-sm"
        disabled
        ref={triggerRef}
        title="Disponible próximamente"
        type="button"
      >
        <Icon className="h-5 w-5" name="lock" />
        Donar mis planchas
      </button>

      {open && (
        <div
          aria-labelledby="worksheet-donation-title"
          aria-modal="true"
          className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-slate-950/75 p-4 backdrop-blur-sm sm:p-6"
          onMouseDown={event => event.target === event.currentTarget && setOpen(false)}
          role="dialog"
        >
          <section className="relative my-auto max-h-[min(860px,calc(100dvh-2rem))] w-full max-w-3xl overflow-y-auto rounded-[1.75rem] border border-white/20 bg-slate-50 shadow-2xl">
            <header className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-200 bg-white/95 px-5 py-5 backdrop-blur sm:px-7">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.22em] text-royal">FIQT Reviews</p>
                <h2 className="mt-1 text-2xl font-black text-ink sm:text-3xl" id="worksheet-donation-title">Donar mis planchas</h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                  Aquí puedes donar todas las planchas que desees. Cuando completes el paso 3 de Tu ruta de recompensas, cada plancha donada tendrá el mismo valor que una reseña: por ejemplo, siete planchas equivaldrán a completar el paso 4, y así progresivamente.
                </p>
              </div>
              <button
                aria-label="Cerrar donación de planchas"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-700 transition hover:border-royal hover:text-royal focus:outline-none focus:ring-2 focus:ring-royal"
                onClick={() => setOpen(false)}
                ref={closeRef}
                type="button"
              >
                <Icon className="h-5 w-5" name="close" />
              </button>
            </header>

            <div className="p-5 sm:p-7">
              <h3 className="text-2xl font-black text-ink">Agregar planchas</h3>
              <p className="mt-2 text-sm text-slate-600">Selecciona el curso y los datos correspondientes a los archivos que deseas donar.</p>
              <div className="mt-5">
                <AdminWorksheetUploadForm apiBaseOverride="/api/worksheet-donations" courses={courses} submitLabel="Donar planchas" />
              </div>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
