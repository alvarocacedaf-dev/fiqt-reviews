'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

const MAX_IMAGES = 5;
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

function safeFileName(name: string) {
  const extension = name.includes('.') ? `.${name.split('.').pop()!.toLowerCase()}` : '';
  const base = name
    .slice(0, extension ? -extension.length : undefined)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'evidencia';
  return `${base}${extension}`;
}

export function ChatReportForm({
  threadId,
  userId,
  alreadyReported,
}: {
  threadId: string;
  userId: string;
  alreadyReported: boolean;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(alreadyReported);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || sent) return;

    const form = new FormData(event.currentTarget);
    const description = String(form.get('description') ?? '').trim();

    if (description.length < 10 || description.length > 2000) {
      setError('Describe lo ocurrido usando entre 10 y 2000 caracteres.');
      return;
    }

    if (files.length === 0) {
      setError('tienes que adjuntar al menos una foto');
      return;
    }

    if (files.length > MAX_IMAGES) {
      setError(`Puedes adjuntar como máximo ${MAX_IMAGES} imágenes.`);
      return;
    }

    for (const file of files) {
      if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
        setError('Solo se permiten imágenes JPG, PNG o WEBP.');
        return;
      }
      if (file.size > MAX_IMAGE_SIZE) {
        setError('Cada imagen debe pesar como máximo 5 MB.');
        return;
      }
    }

    const db = createClient();
    const reportId = crypto.randomUUID();
    const uploadedPaths: string[] = [];

    try {
      setPending(true);
      setError('');

      const attachments = [];
      for (const file of files) {
        const path = `${threadId}/${userId}/${reportId}/${crypto.randomUUID()}-${safeFileName(file.name)}`;
        const { error: uploadError } = await db.storage
          .from('chat-report-evidence')
          .upload(path, file, { upsert: false });

        if (uploadError) throw new Error(`No se pudo subir ${file.name}: ${uploadError.message}`);

        uploadedPaths.push(path);
        attachments.push({
          path,
          name: file.name,
          type: file.type,
          size: file.size,
        });
      }

      const { error: reportError } = await db.rpc('create_chat_report', {
        p_report_id: reportId,
        p_thread_id: threadId,
        p_description: description,
        p_attachments: attachments,
      });

      if (reportError) throw new Error(reportError.message);

      formRef.current?.reset();
      setFiles([]);
      setSent(true);
      router.push(`/mis-matches?chat=${encodeURIComponent(threadId)}&success=${encodeURIComponent('Tu reporte fue enviado a la administración.')}`);
      router.refresh();
    } catch (caughtError) {
      if (uploadedPaths.length) {
        await db.storage.from('chat-report-evidence').remove(uploadedPaths);
      }
      setError(caughtError instanceof Error ? caughtError.message : 'No se pudo enviar el reporte.');
    } finally {
      setPending(false);
    }
  }

  if (sent) {
    return (
      <p className="mt-3 rounded-2xl bg-emerald-50 p-3 text-xs font-bold text-emerald-800">
        Reporte enviado a la administración.
      </p>
    );
  }

  return (
    <details className="mt-3 rounded-2xl border border-red-200 bg-red-50">
      <summary className="cursor-pointer list-none px-4 py-3 text-sm font-black text-red-700 [&::-webkit-details-marker]:hidden">
        ⚠ Reportar este chat
      </summary>
      <form className="border-t border-red-200 p-4" onSubmit={handleSubmit} ref={formRef}>
        <p className="text-xs leading-5 text-red-900">
          Si este chat no te sirvió para tu intercambio de planchas, describe brevemente lo sucedido y envía
          fotos del chat.
        </p>

        <label className="mt-4 block text-xs font-black text-ink">
          ¿Qué sucedió?
          <textarea
            className="input mt-2 min-h-28 w-full resize-y"
            maxLength={2000}
            minLength={10}
            name="description"
            placeholder="Describe brevemente el problema con el intercambio..."
            required
          />
        </label>

        <label className="mt-4 block text-xs font-black text-ink">
          Fotos del chat
          <input
            accept={ACCEPTED_IMAGE_TYPES.join(',')}
            className="mt-2 block w-full text-xs text-slate-600 file:mr-3 file:rounded-xl file:border-0 file:bg-white file:px-3 file:py-2 file:font-black file:text-royal"
            multiple
            onChange={event => {
              const selected = Array.from(event.target.files ?? []);
              setFiles(selected);
              setError(selected.length > MAX_IMAGES ? `Puedes adjuntar como máximo ${MAX_IMAGES} imágenes.` : '');
            }}
            type="file"
          />
        </label>

        {!!files.length && (
          <p className="mt-2 text-[11px] font-semibold text-slate-600">
            {files.length} imagen{files.length === 1 ? '' : 'es'} seleccionada{files.length === 1 ? '' : 's'}.
          </p>
        )}

        {error && <p className="mt-3 text-xs font-bold text-red-700">{error}</p>}

        <button
          className="mt-4 rounded-xl bg-red-700 px-4 py-2.5 text-xs font-black text-white transition hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={pending || files.length > MAX_IMAGES}
          type="submit"
        >
          {pending ? 'Enviando reporte…' : 'Enviar reporte'}
        </button>
        <p className="mt-2 text-[10px] text-slate-500">Hasta 5 imágenes JPG, PNG o WEBP de 5 MB cada una.</p>
      </form>
    </details>
  );
}
