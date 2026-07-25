'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

const MAX_FILE_SIZE = 25 * 1024 * 1024;
const ACCEPTED_EXTENSIONS = [
  '.jpg', '.jpeg', '.png', '.webp', '.pdf', '.doc', '.docx',
  '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.zip',
];

type CourseOption = {
  id: string;
  code: string | null;
  name: string;
};

function safeFileName(name: string) {
  const extension = name.includes('.') ? `.${name.split('.').pop()!.toLowerCase()}` : '';
  const base = name
    .slice(0, extension ? -extension.length : undefined)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100) || 'plancha';
  return `${base}${extension}`;
}

export function AdminWorksheetUploadForm({
  courses,
  userId,
}: {
  courses: CourseOption[];
  userId: string;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;

    const form = new FormData(event.currentTarget);
    const courseId = String(form.get('course_id') ?? '');
    const title = String(form.get('title') ?? '').trim();
    const examType = String(form.get('exam_type') ?? 'other');
    const academicTerm = String(form.get('academic_term') ?? '').trim();
    const files = form.getAll('files').filter((value): value is File => value instanceof File && value.size > 0);

    if (!courseId || !files.length) {
      setMessage({ type: 'error', text: 'Selecciona un curso y al menos un archivo.' });
      return;
    }
    if (title && files.length > 1) {
      setMessage({ type: 'error', text: 'El título personalizado solo puede usarse al subir un archivo.' });
      return;
    }

    const db = createClient();

    try {
      setPending(true);
      setMessage(null);

      for (const file of files) {
        const extension = file.name.includes('.') ? `.${file.name.split('.').pop()!.toLowerCase()}` : '';
        if (!ACCEPTED_EXTENSIONS.includes(extension)) {
          throw new Error(`El formato de “${file.name}” no está permitido.`);
        }
        if (file.size > MAX_FILE_SIZE) {
          throw new Error(`“${file.name}” supera el límite de 25 MB.`);
        }

        const path = `${courseId}/${userId}/${crypto.randomUUID()}-${safeFileName(file.name)}`;
        const { error: uploadError } = await db.storage
          .from('admin-worksheets')
          .upload(path, file, { upsert: false });
        if (uploadError) throw new Error(`No se pudo subir “${file.name}”: ${uploadError.message}`);

        const displayTitle = title || file.name.replace(/\.[^.]+$/, '');
        const { error: insertError } = await db.from('admin_worksheets').insert({
          course_id: courseId,
          title: displayTitle,
          exam_type: examType,
          academic_term: academicTerm || null,
          file_path: path,
          file_name: file.name,
          mime_type: file.type || null,
          file_size: file.size,
          uploaded_by: userId,
        });

        if (insertError) {
          await db.storage.from('admin-worksheets').remove([path]);
          throw new Error(`No se pudo registrar “${file.name}”: ${insertError.message}`);
        }
      }

      formRef.current?.reset();
      setMessage({
        type: 'success',
        text: `${files.length} plancha${files.length === 1 ? '' : 's'} guardada${files.length === 1 ? '' : 's'} correctamente.`,
      });
      router.refresh();
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'No se pudieron subir las planchas.',
      });
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="grid gap-4" onSubmit={handleSubmit} ref={formRef}>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="text-sm font-bold text-slate-700">
          Carpeta del curso
          <select className="input mt-1" name="course_id" required>
            <option value="">Selecciona un curso</option>
            {courses.map(course => (
              <option key={course.id} value={course.id}>
                {course.code || 'Sin código'} — {course.name}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm font-bold text-slate-700">
          Tipo de evaluación
          <select className="input mt-1" defaultValue="other" name="exam_type">
            <option value="practice">Práctica</option>
            <option value="quiz">Control o paso</option>
            <option value="midterm">Examen parcial</option>
            <option value="final">Examen final</option>
            <option value="other">Otro</option>
          </select>
        </label>

        <label className="text-sm font-bold text-slate-700">
          Ciclo académico
          <input className="input mt-1" maxLength={20} name="academic_term" placeholder="Ejemplo: 2026-1" />
        </label>

        <label className="text-sm font-bold text-slate-700">
          Título personalizado
          <input className="input mt-1" maxLength={160} name="title" placeholder="Opcional si subes un solo archivo" />
        </label>
      </div>

      <label className="rounded-2xl border-2 border-dashed border-blue-200 bg-blue-50 p-5 text-center text-sm font-bold text-royal">
        Selecciona una o varias planchas
        <input
          accept={ACCEPTED_EXTENSIONS.join(',')}
          className="mt-3 block w-full text-sm text-slate-600"
          multiple
          name="files"
          required
          type="file"
        />
        <span className="mt-2 block text-xs font-normal text-slate-500">
          Imágenes, PDF, Office, TXT o ZIP. Máximo 25 MB por archivo.
        </span>
      </label>

      {message && (
        <p className={`rounded-xl p-3 text-sm font-bold ${
          message.type === 'success'
            ? 'bg-emerald-50 text-emerald-800'
            : 'bg-red-50 text-red-800'
        }`}>
          {message.text}
        </p>
      )}

      <button className="btn-primary justify-self-start" disabled={pending} type="submit">
        {pending ? 'Guardando planchas…' : 'Guardar en la carpeta'}
      </button>
    </form>
  );
}

export function AdminWorksheetDeleteButton({
  fileId,
  filePath,
}: {
  fileId: string;
  filePath: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  async function removeFile() {
    if (!window.confirm('¿Eliminar esta plancha de forma permanente?')) return;
    const db = createClient();

    try {
      setPending(true);
      setError('');
      const { error: rowError } = await db.from('admin_worksheets').delete().eq('id', fileId);
      if (rowError) throw new Error(rowError.message);

      const { error: storageError } = await db.storage.from('admin-worksheets').remove([filePath]);
      if (storageError) {
        setError('El registro fue eliminado, pero el archivo no pudo limpiarse del almacenamiento.');
      }
      router.refresh();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'No se pudo eliminar la plancha.');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="text-right">
      <button
        className="rounded-xl border border-red-200 px-3 py-2 text-xs font-black text-red-700 transition hover:bg-red-50 disabled:opacity-50"
        disabled={pending}
        onClick={removeFile}
        type="button"
      >
        {pending ? 'Eliminando…' : 'Eliminar'}
      </button>
      {error && <p className="mt-1 max-w-40 text-xs font-semibold text-red-700">{error}</p>}
    </div>
  );
}
