'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

const MAX_TOTAL_SIZE = 40 * 1024 * 1024;
const MIN_FILES = 2;
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

async function sha256(file: File) {
  const digest = await crypto.subtle.digest('SHA-256', await file.arrayBuffer());
  return Array.from(new Uint8Array(digest))
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('');
}

function formatMegabytes(bytes: number) {
  return (bytes / (1024 * 1024)).toFixed(2);
}

export function ChatExchangeDeliveryForm({
  threadId,
  userId,
  alreadySubmitted,
  otherSubmitted,
}: {
  threadId: string;
  userId: string;
  alreadySubmitted: boolean;
  otherSubmitted: boolean;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  if (alreadySubmitted) {
    return (
      <div className="border-t border-slate-200 bg-emerald-50 p-4 text-center">
        <p className="text-sm font-black text-emerald-900">Tus archivos ya fueron entregados</p>
        <p className="mt-1 text-xs leading-5 text-emerald-800">
          {otherSubmitted
            ? 'Ambas entregas están completas. El chat se activará automáticamente.'
            : 'La otra persona todavía debe entregar sus archivos para activar el chat y habilitar las descargas.'}
        </p>
      </div>
    );
  }

  async function submitFiles() {
    if (pending) return;
    if (files.length < MIN_FILES) {
      setError(`Debes seleccionar al menos ${MIN_FILES} archivos para realizar tu entrega.`);
      return;
    }

    const totalSize = files.reduce((total, file) => total + file.size, 0);
    if (totalSize > MAX_TOTAL_SIZE) {
      setError(`Los archivos seleccionados pesan ${formatMegabytes(totalSize)} MB. El máximo total es 40 MB.`);
      return;
    }

    for (const file of files) {
      const extension = file.name.includes('.') ? `.${file.name.split('.').pop()!.toLowerCase()}` : '';
      if (!ACCEPTED_EXTENSIONS.includes(extension)) {
        setError(`El formato de “${file.name}” no está permitido.`);
        return;
      }
      if (file.size < 1) {
        setError(`“${file.name}” está vacío.`);
        return;
      }
    }

    const db = createClient();
    const uploadedPaths: string[] = [];

    try {
      setPending(true);
      setError('');

      const preparedFiles = await Promise.all(
        files.map(async file => ({ file, hash: await sha256(file) })),
      );
      const hashes = new Set(preparedFiles.map(item => item.hash));
      if (hashes.size !== preparedFiles.length) {
        throw new Error('Hay archivos duplicados. Retira las copias repetidas antes de continuar.');
      }

      const metadata = [];
      for (const { file, hash } of preparedFiles) {
        const path = `${threadId}/${userId}/exchange/${hash}-${safeFileName(file.name)}`;
        const { error: uploadError } = await db.storage
          .from('chat-attachments')
          .upload(path, file, { upsert: false });
        if (uploadError) throw new Error(`No se pudo subir “${file.name}”: ${uploadError.message}`);

        uploadedPaths.push(path);
        metadata.push({
          path,
          name: file.name,
          type: file.type || 'application/octet-stream',
          size: file.size,
          sha256: hash,
        });
      }

      const { error: submitError } = await db.rpc('submit_chat_exchange', {
        p_thread_id: threadId,
        p_files: metadata,
      });
      if (submitError) throw new Error(submitError.message);

      setFiles([]);
      if (inputRef.current) inputRef.current.value = '';
      router.refresh();
    } catch (caughtError) {
      if (uploadedPaths.length) {
        await db.storage.from('chat-attachments').remove(uploadedPaths);
      }
      setError(caughtError instanceof Error ? caughtError.message : 'No se pudo registrar la entrega.');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="border-t border-slate-200 bg-amber-50 p-4">
      <p className="text-center text-sm font-black text-amber-950">Entrega tus planchas para iniciar</p>
      <p className="mx-auto mt-1 max-w-xl text-center text-xs leading-5 text-amber-900">
        Selecciona todos los archivos que intercambiarás. Después de confirmar la entrega no podrás reemplazarlos.
      </p>

      <div className="mx-auto mt-3 max-w-xl rounded-2xl border border-amber-200 bg-white p-3">
        <input
          accept={ACCEPTED_EXTENSIONS.join(',')}
          className="block w-full text-xs text-slate-600"
          disabled={pending}
          multiple
          onChange={event => {
            setFiles(Array.from(event.target.files ?? []));
            setError('');
          }}
          ref={inputRef}
          type="file"
        />
        {files.length > 0 && (
          <>
            <p className="mt-3 text-xs font-bold text-royal">
              {files.length} archivos · {formatMegabytes(files.reduce((total, file) => total + file.size, 0))} MB de 40 MB
            </p>
            <ul className="mt-2 max-h-24 space-y-1 overflow-y-auto text-xs text-slate-600">
              {files.map(file => (
                <li className="truncate" key={`${file.name}-${file.lastModified}`}>• {file.name}</li>
              ))}
            </ul>
          </>
        )}
        <button
          className="btn-primary mt-3 w-full"
          disabled={pending}
          onClick={submitFiles}
          type="button"
        >
          {pending ? 'Entregando archivos…' : 'Confirmar entrega de archivos'}
        </button>
        {error && <p className="mt-2 text-xs font-bold text-red-700">{error}</p>}
        <p className="mt-2 text-[11px] text-slate-500">
          Mínimo 2 archivos, sin límite de cantidad. Imágenes, PDF, Office, TXT o ZIP de máximo 40 MB en total.
        </p>
      </div>
    </div>
  );
}
