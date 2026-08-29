'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { createClient } from '@/lib/supabase/client';

type ContributionStatus = 'pending' | 'approved' | 'rejected' | null;

const statusLabels: Record<Exclude<ContributionStatus, null>, string> = {
  pending: 'Comprobante pendiente de revisión',
  approved: 'Aporte verificado',
  rejected: 'Comprobante rechazado · puedes enviarlo nuevamente',
};

export function ContributionModal({ initialStatus }: { initialStatus: ContributionStatus }) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState(initialStatus);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

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

  async function submit(formData: FormData) {
    const file = formData.get('receipt') as File;
    setMessage('');

    if (!file?.size) return setMessage('Selecciona una imagen de tu comprobante.');
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      return setMessage('El comprobante debe ser una imagen JPG, PNG o WebP.');
    }
    if (file.size > 5 * 1024 * 1024) return setMessage('La imagen no debe superar los 5 MB.');

    setSubmitting(true);
    const db = createClient();
    const { data: { user } } = await db.auth.getUser();

    if (!user) {
      setSubmitting(false);
      return setMessage('Inicia sesión antes de enviar tu comprobante.');
    }

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const path = `${user.id}/${crypto.randomUUID()}-${safeName}`;
    const { error: uploadError } = await db.storage
      .from('contribution-evidence')
      .upload(path, file, { cacheControl: '3600', upsert: false });

    if (uploadError) {
      setSubmitting(false);
      return setMessage(uploadError.message);
    }

    const { error } = await db.from('contribution_submissions').insert({
      user_id: user.id,
      receipt_path: path,
      amount: 1.5,
      status: 'pending',
    });

    if (error) {
      await db.storage.from('contribution-evidence').remove([path]);
      setSubmitting(false);
      return setMessage(error.message);
    }

    formRef.current?.reset();
    setStatus('pending');
    setMessage('Comprobante enviado. Quedó pendiente de revisión.');
    setSubmitting(false);
  }

  const verified = status === 'approved';
  const pending = status === 'pending';

  return (
    <>
      <button
        className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition hover:-translate-y-0.5 hover:border-gold ${
          verified
            ? 'border-emerald-300/40 bg-emerald-400/15'
            : pending
              ? 'border-amber-300/50 bg-amber-300/10'
              : 'border-gold/50 bg-gold/10'
        }`}
        onClick={() => setOpen(true)}
        ref={triggerRef}
        type="button"
      >
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-black ${verified ? 'bg-emerald-300 text-emerald-950' : 'bg-white/10 text-gold'}`}>
          S/
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-black text-white">Aporte a la página</span>
          <span className="mt-0.5 block text-[11px] font-bold text-blue-200">
            {status ? statusLabels[status] : 'Primer paso de tu ruta'}
          </span>
        </span>
        <Icon className="h-4 w-4" name={verified ? 'check' : pending ? 'verification' : 'arrow-right'} />
      </button>

      {open && (
        <div
          aria-labelledby="contribution-title"
          aria-modal="true"
          className="fixed inset-0 z-[110] flex items-center justify-center overflow-y-auto bg-slate-950/75 p-4 backdrop-blur-sm sm:p-6"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setOpen(false);
          }}
          role="dialog"
        >
          <section className="relative my-auto max-h-[calc(100dvh-2rem)] w-full max-w-2xl overflow-y-auto rounded-[1.75rem] border border-white/20 bg-slate-50 shadow-2xl">
            <header className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-200 bg-white/95 px-5 py-5 backdrop-blur sm:px-7">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.22em] text-royal">Tu ruta de recompensas</p>
                <h2 className="mt-1 text-2xl font-black text-ink sm:text-3xl" id="contribution-title">Aporte a la página</h2>
              </div>
              <button
                aria-label="Cerrar aporte"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-700 transition hover:border-royal hover:text-royal focus:outline-none focus:ring-2 focus:ring-royal"
                onClick={() => setOpen(false)}
                ref={closeRef}
                type="button"
              >
                <Icon className="h-5 w-5" name="close" />
              </button>
            </header>

            <div className="space-y-5 p-5 sm:p-7">
              <div className="rounded-2xl border border-blue-100 bg-white p-5 text-sm leading-6 text-slate-700 shadow-sm">
                <p>Para iniciar tu ruta de recompensas, deberás aportar <strong>S/ 1.50</strong> a través de este QR.</p>
                <p className="mt-3">Esto permite que la página pueda almacenar las más de 2000 planchas que se proyecta tener durante esta primera semana. Posteriormente, se espera que esta cantidad continúe creciendo con el paso del tiempo.</p>
              </div>

              <div className="mx-auto max-w-sm overflow-hidden rounded-2xl border border-purple-200 bg-purple-700 shadow-card">
                <Image
                  alt="Código QR de Yape para realizar el aporte"
                  className="h-auto w-full"
                  height={1600}
                  priority
                  src="/images/yape-aporte-fiqt.png"
                  width={1131}
                />
              </div>

              {verified ? (
                <p className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-900">Tu aporte ya fue verificado. Gracias por contribuir con FIQT Reviews.</p>
              ) : pending ? (
                <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-900">Tu comprobante está pendiente de revisión. No necesitas enviarlo nuevamente.</p>
              ) : (
                <form action={submit} className="space-y-4" ref={formRef}>
                  <label className="block rounded-2xl border-2 border-dashed border-blue-200 bg-blue-50 p-5 text-center font-bold text-royal">
                    Sube aquí tu comprobante
                    <input
                      accept="image/jpeg,image/png,image/webp"
                      className="mt-3 block w-full text-sm font-normal text-slate-600"
                      name="receipt"
                      required
                      type="file"
                    />
                    <span className="mt-2 block text-xs font-normal text-slate-500">JPG, PNG o WebP. Máximo 5 MB.</span>
                  </label>
                  <button className="btn-primary w-full" disabled={submitting} type="submit">
                    {submitting ? 'Enviando…' : 'Enviar'}
                  </button>
                </form>
              )}

              {message && (
                <p aria-live="polite" className={`rounded-xl p-4 text-sm font-semibold ${status === 'pending' ? 'bg-emerald-50 text-emerald-900' : 'bg-red-50 text-red-800'}`}>
                  {message}
                </p>
              )}
            </div>
          </section>
        </div>
      )}
    </>
  );
}
