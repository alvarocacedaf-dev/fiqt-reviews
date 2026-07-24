'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ACCEPTED_EXTENSIONS = [
  '.jpg', '.jpeg', '.png', '.webp', '.gif', '.pdf', '.doc', '.docx',
  '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.zip',
];

function safeFileName(name: string) {
  const extension = name.includes('.') ? `.${name.split('.').pop()!.toLowerCase()}` : '';
  const base = name
    .slice(0, extension ? -extension.length : undefined)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'archivo';
  return `${base}${extension}`;
}

export function ChatComposer({
  threadId,
  userId,
}: {
  threadId: string;
  userId: string;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;

    const form = new FormData(event.currentTarget);
    const body = String(form.get('body') ?? '').trim();
    const file = form.get('attachment');

    if (!body && (!(file instanceof File) || file.size === 0)) {
      setError('Escribe un mensaje o adjunta un archivo.');
      return;
    }

    if (body.length > 4000) {
      setError('El mensaje no puede superar los 4000 caracteres.');
      return;
    }

    let attachmentPath: string | null = null;
    let attachmentName: string | null = null;
    let attachmentType: string | null = null;
    let attachmentSize: number | null = null;
    const db = createClient();

    try {
      setPending(true);
      setError('');

      if (file instanceof File && file.size > 0) {
        const extension = file.name.includes('.') ? `.${file.name.split('.').pop()!.toLowerCase()}` : '';
        if (!ACCEPTED_EXTENSIONS.includes(extension)) {
          throw new Error('Formato no permitido. Adjunta una imagen, PDF, documento de Office, TXT o ZIP.');
        }
        if (file.size > MAX_FILE_SIZE) {
          throw new Error('El archivo supera el límite de 10 MB.');
        }

        attachmentName = file.name;
        attachmentType = file.type || 'application/octet-stream';
        attachmentSize = file.size;
        attachmentPath = `${threadId}/${userId}/${crypto.randomUUID()}-${safeFileName(file.name)}`;

        const { error: uploadError } = await db.storage
          .from('chat-attachments')
          .upload(attachmentPath, file, { upsert: false });

        if (uploadError) throw new Error(`No se pudo adjuntar el archivo: ${uploadError.message}`);
      }

      const { error: sendError } = await db.rpc('send_chat_message', {
        p_thread_id: threadId,
        p_body: body || null,
        p_attachment_path: attachmentPath,
        p_attachment_name: attachmentName,
        p_attachment_type: attachmentType,
        p_attachment_size: attachmentSize,
      });

      if (sendError) {
        if (attachmentPath) {
          await db.storage.from('chat-attachments').remove([attachmentPath]);
        }
        throw new Error(sendError.message);
      }

      formRef.current?.reset();
      setFileName('');
      router.refresh();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'No se pudo enviar el mensaje.');
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="border-t border-slate-200 bg-white p-3" onSubmit={handleSubmit} ref={formRef}>
      {fileName && (
        <div className="mb-2 flex items-center justify-between gap-3 rounded-xl bg-blue-50 px-3 py-2 text-xs font-semibold text-royal">
          <span className="min-w-0 truncate">📎 {fileName}</span>
          <button
            className="shrink-0 font-black text-red-700"
            onClick={() => {
              if (fileRef.current) fileRef.current.value = '';
              setFileName('');
            }}
            type="button"
          >
            Quitar
          </button>
        </div>
      )}

      <div className="flex items-end gap-2">
        <label
          className="grid h-11 w-11 shrink-0 cursor-pointer place-items-center rounded-full bg-blue-50 text-xl text-royal transition hover:bg-blue-100"
          title="Adjuntar archivo"
        >
          <span aria-hidden="true">📎</span>
          <span className="sr-only">Adjuntar archivo</span>
          <input
            accept={ACCEPTED_EXTENSIONS.join(',')}
            className="hidden"
            name="attachment"
            onChange={event => setFileName(event.target.files?.[0]?.name ?? '')}
            ref={fileRef}
            type="file"
          />
        </label>
        <textarea
          aria-label="Mensaje"
          className="min-h-11 max-h-32 flex-1 resize-y rounded-2xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm outline-none transition focus:border-royal focus:bg-white"
          maxLength={4000}
          name="body"
          placeholder="Escribe un mensaje..."
          rows={1}
        />
        <button
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-royal text-lg font-black text-white transition hover:bg-[#0d2f6c] disabled:cursor-not-allowed disabled:opacity-50"
          disabled={pending}
          title="Enviar mensaje"
          type="submit"
        >
          <span aria-hidden="true">{pending ? '…' : '➤'}</span>
          <span className="sr-only">Enviar mensaje</span>
        </button>
      </div>

      {error && <p className="mt-2 text-xs font-bold text-red-700">{error}</p>}
      <p className="mt-2 text-[11px] text-slate-500">
        Imágenes y documentos de hasta 10 MB.
      </p>
    </form>
  );
}
