'use client';

import { type FormEvent, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { InlineSpinner } from '@/components/ui/InlineSpinner';

async function sha256(file: File) {
  const bytes = await new Promise<ArrayBuffer>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(reader.error ?? new Error('No se pudo leer el archivo.'));
    reader.readAsArrayBuffer(file);
  });
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}

export function VerificationForm() {
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
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

      const contentHash = await sha256(file);

      const path = `${user.id}/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
      const { error: uploadError } = await db.storage
        .from('verification-evidence')
        .upload(path, file, { upsert: false });

      if (uploadError) return setMessage('No pudimos subir la evidencia. Revisa tu conexión e inténtalo nuevamente.');

      const submissionId = crypto.randomUUID();
      const { error } = await db.from('verification_submissions').insert({
        id: submissionId,
        user_id: user.id,
        file_url: path,
        content_hash: contentHash,
        status: 'pending',
      });

      if (error) {
        await db.storage.from('verification-evidence').remove([path]);
        if (error.code === '23505') {
          setSubmitted(true);
          return setMessage('Este mismo archivo ya fue enviado y continúa pendiente de revisión. Puedes enviar otro documento diferente.');
        }
        if (error.message.toLowerCase().includes('demasiados intentos')) {
          return setMessage('Alcanzaste el límite de 5 evidencias de verificación por día. Intenta nuevamente mañana.');
        }
        return setMessage('No pudimos registrar la evidencia. Inténtalo nuevamente.');
      }

      await fetch('/api/admin-notifications/dispatch', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventType: 'verification_pending', eventId: submissionId }),
      }).catch(() => undefined);
      setSubmitted(true);
      if (fileRef.current) fileRef.current.value = '';
      setMessage('Evidencia enviada. Quedó pendiente de revisión.');
    } catch {
      setMessage('No pudimos enviar la evidencia. Revisa tu conexión e inténtalo nuevamente.');
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  function startAnotherSubmission() {
    setSubmitted(false);
    setMessage('');
    if (fileRef.current) fileRef.current.value = '';
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
          disabled={submitting || submitted}
          ref={fileRef}
        />
      </label>
      {message && <p aria-live="polite" className="rounded-xl bg-blue-50 p-3 text-sm text-blue-950">{message}</p>}
      <button className="btn-primary min-w-52 gap-2 disabled:cursor-wait disabled:opacity-70" disabled={submitting || submitted} type="submit">
        {submitting && <InlineSpinner />}
        {submitting ? 'Enviando evidencia…' : submitted ? 'Evidencia enviada' : 'Enviar para revisión'}
      </button>
      {submitted && (
        <button className="btn-secondary min-w-52" onClick={startAnotherSubmission} type="button">
          Enviar otra evidencia
        </button>
      )}
    </form>
  );
}
