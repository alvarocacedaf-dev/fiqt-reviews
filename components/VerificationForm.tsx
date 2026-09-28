'use client';

import { type FormEvent, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { InlineSpinner } from '@/components/ui/InlineSpinner';

export function VerificationForm() {
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submittingRef.current) return;
    const file = fileRef.current?.files?.[0];
    if (!file?.size) return setMessage('Selecciona una imagen o PDF.');

    submittingRef.current = true;
    setSubmitting(true);
    setMessage('');

    try {
      const db = createClient();
      const { data: { user } } = await db.auth.getUser();

      if (!user) return setMessage('Inicia sesión antes de enviar una evidencia.');

      const path = `${user.id}/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
      const { error: uploadError } = await db.storage
        .from('verification-evidence')
        .upload(path, file, { upsert: false });

      if (uploadError) return setMessage('No pudimos subir la evidencia. Revisa tu conexión e inténtalo nuevamente.');

      const { error } = await db.from('verification_submissions').insert({
        user_id: user.id,
        file_url: path,
        status: 'pending',
      });

      if (error) {
        await db.storage.from('verification-evidence').remove([path]);
        if (error.message.toLowerCase().includes('demasiados intentos')) {
          return setMessage('Alcanzaste el límite de 5 evidencias de verificación por día. Intenta nuevamente mañana.');
        }
        return setMessage('No pudimos registrar la evidencia. Inténtalo nuevamente.');
      }

      setMessage('Evidencia enviada. Quedó pendiente de revisión.');
    } catch {
      setMessage('No pudimos enviar la evidencia. Revisa tu conexión e inténtalo nuevamente.');
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  return (
    <form aria-busy={submitting} className="space-y-4" onSubmit={submit}>
      <label className="block font-semibold">
        Evidencia académica
        <input
          required
          accept="image/png,image/jpeg,application/pdf"
          name="evidence"
          type="file"
          className="mt-2 block w-full text-sm"
          disabled={submitting}
          ref={fileRef}
        />
      </label>
      {message && <p aria-live="polite" className="rounded-xl bg-blue-50 p-3 text-sm text-blue-950">{message}</p>}
      <button className="btn-primary min-w-52 gap-2 disabled:cursor-wait" disabled={submitting} type="submit">
        {submitting && <InlineSpinner />}
        {submitting ? 'Enviando evidencia…' : 'Enviar para revisión'}
      </button>
    </form>
  );
}
