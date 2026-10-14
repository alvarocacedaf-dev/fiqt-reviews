'use client';

import { useEffect, useRef, useState } from 'react';
import { Icon } from '@/components/ui/Icon';

export const OPEN_REWARD_CAMPAIGN_EVENT = 'fiqt:open-reward-campaign';

export function RewardCampaignNotice({ initialOpen = false }: { initialOpen?: boolean }) {
  const [open, setOpen] = useState(initialOpen);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const showNotice = () => setOpen(true);
    window.addEventListener(OPEN_REWARD_CAMPAIGN_EVENT, showNotice);
    return () => window.removeEventListener(OPEN_REWARD_CAMPAIGN_EVENT, showNotice);
  }, []);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    const closeWithEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', closeWithEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', closeWithEscape);
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      aria-labelledby="reward-campaign-title"
      aria-modal="true"
      className="fixed inset-0 z-[120] flex items-center justify-center overflow-y-auto bg-slate-950/80 p-4 backdrop-blur-sm sm:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) setOpen(false);
      }}
      role="dialog"
    >
      <section className="relative my-auto w-full max-w-2xl overflow-hidden rounded-[1.75rem] border border-gold/50 bg-[#071a3d] text-white shadow-[0_0_60px_rgba(250,204,21,0.2)]">
        <header className="flex items-start justify-between gap-4 border-b border-white/10 bg-white/5 px-5 py-5 sm:px-7">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-gold">Beneficio especial por parciales</p>
            <h2 className="mt-1 text-2xl font-black sm:text-3xl" id="reward-campaign-title">Acceso completo a todas las planchas</h2>
          </div>
          <button
            aria-label="Cerrar aviso"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white transition hover:border-gold hover:text-gold focus:outline-none focus:ring-2 focus:ring-gold"
            onClick={() => setOpen(false)}
            ref={closeRef}
            type="button"
          >
            <Icon className="h-5 w-5" name="close" />
          </button>
        </header>

        <div className="p-5 sm:p-7">
          <div className="rounded-2xl border border-gold/50 bg-gold/10 p-5 text-sm font-semibold leading-7 text-yellow-50 sm:text-base">
            Debido a que se acercan los parciales y esta semana también habrá exposiciones y prácticas, se habilitará el acceso a <strong className="font-black text-gold">todas las planchas</strong> para los <strong className="font-black text-gold">primeros 50 usuarios</strong> que completen los <strong className="font-black text-gold">dos primeros pasos</strong> de <strong className="font-black uppercase text-gold">Tu ruta de recompensas</strong>.
            <br /><br />
            Esta promoción estará vigente durante estas dos semanas, <strong className="font-black text-gold">del 12/10 al 24/10</strong>, fecha en que terminan los parciales. Quienes ya hayan completado estos pasos antes de esta semana también recibirán <strong className="font-black text-gold">acceso completo a la página y a todas sus planchas</strong>.
          </div>
          <p className="mt-5 text-center text-lg font-black text-gold">¡Éxitos en sus parciales!</p>
          <button className="btn-primary mt-5 w-full" onClick={() => setOpen(false)} type="button">Entendido</button>
        </div>
      </section>
    </div>
  );
}
