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
  cycle_id?: number | null;
};

type CycleOption = {
  id: number;
  number: number;
  name: string;
};

type ExamType = 'practice' | 'midterm' | 'final' | 'substitute' | 'quiz' | 'other';

type WorksheetFile = {
  id: string;
  course_id: string;
  title: string;
  exam_type: ExamType;
  academic_term: string | null;
  file_path: string;
  file_name: string;
  mime_type: string | null;
  file_size: number;
  created_at: string;
  signed_url?: string | null;
};

const FOLDER_CATEGORIES: { type: ExamType; label: string }[] = [
  { type: 'practice', label: 'Prácticas calificadas' },
  { type: 'midterm', label: 'Exámenes parciales' },
  { type: 'final', label: 'Exámenes finales' },
  { type: 'substitute', label: 'Exámenes sustitutorios' },
];

const LEGACY_CATEGORY_LABELS: Partial<Record<ExamType, string>> = {
  quiz: 'Controles o pasos',
  other: 'Otros materiales',
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

function formatDate(value: string) {
  return new Intl.DateTimeFormat('es-PE', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'America/Lima',
  }).format(new Date(value));
}

function formatBytes(value: number) {
  if (value < 1024 * 1024) return `${Math.max(1, Math.round(value / 1024))} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
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
            <option value="substitute">Examen sustitutorio</option>
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

type UploadDraft = {
  courseId: string;
  examType: ExamType;
  files: File[];
  academicTerm: string;
  title: string;
};

export function AdminWorksheetLibraryTree({
  cycles,
  courses,
  files,
  userId,
}: {
  cycles: CycleOption[];
  courses: CourseOption[];
  files: WorksheetFile[];
  userId: string;
}) {
  const router = useRouter();
  const [openCategories, setOpenCategories] = useState<string[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<{ courseId: string; examType: ExamType } | null>(null);
  const [uploadDraft, setUploadDraft] = useState<UploadDraft | null>(null);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  function folderKey(courseId: string, examType: ExamType) {
    return `${courseId}:${examType}`;
  }

  function filesFor(courseId: string, examType: ExamType) {
    return files.filter(file => file.course_id === courseId && file.exam_type === examType);
  }

  function toggleCategory(courseId: string, examType: ExamType) {
    const key = folderKey(courseId, examType);
    const isOpen = openCategories.includes(key);

    setOpenCategories(current => (
      isOpen
        ? current.filter(item => item !== key)
        : [...current, key]
    ));
    setSelectedFolder(isOpen ? null : { courseId, examType });
    setMessage(null);
  }

  function selectFiles(
    courseId: string,
    examType: ExamType,
    event: React.ChangeEvent<HTMLInputElement>,
  ) {
    const selectedFiles = Array.from(event.currentTarget.files ?? []);
    event.currentTarget.value = '';
    if (!selectedFiles.length) return;

    const key = folderKey(courseId, examType);
    setOpenCategories(current => current.includes(key) ? current : [...current, key]);
    setSelectedFolder({ courseId, examType });
    setUploadDraft({
      courseId,
      examType,
      files: selectedFiles,
      academicTerm: '',
      title: '',
    });
    setMessage(null);
  }

  async function uploadSelectedFiles() {
    if (!uploadDraft || pending) return;
    if (uploadDraft.title.trim() && uploadDraft.files.length > 1) {
      setMessage({
        type: 'error',
        text: 'El título personalizado solo puede usarse al subir un archivo.',
      });
      return;
    }

    const db = createClient();

    try {
      setPending(true);
      setMessage(null);

      for (const file of uploadDraft.files) {
        const extension = file.name.includes('.') ? `.${file.name.split('.').pop()!.toLowerCase()}` : '';
        if (!ACCEPTED_EXTENSIONS.includes(extension)) {
          throw new Error(`El formato de “${file.name}” no está permitido.`);
        }
        if (file.size > MAX_FILE_SIZE) {
          throw new Error(`“${file.name}” supera el límite de 25 MB.`);
        }

        const path = `${uploadDraft.courseId}/${userId}/${crypto.randomUUID()}-${safeFileName(file.name)}`;
        const { error: uploadError } = await db.storage
          .from('admin-worksheets')
          .upload(path, file, { upsert: false });
        if (uploadError) throw new Error(`No se pudo subir “${file.name}”: ${uploadError.message}`);

        const displayTitle = uploadDraft.title.trim() || file.name.replace(/\.[^.]+$/, '');
        const { error: insertError } = await db.from('admin_worksheets').insert({
          course_id: uploadDraft.courseId,
          title: displayTitle,
          exam_type: uploadDraft.examType,
          academic_term: uploadDraft.academicTerm.trim() || null,
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

      const savedCount = uploadDraft.files.length;
      setUploadDraft(null);
      setMessage({
        type: 'success',
        text: `${savedCount} plancha${savedCount === 1 ? '' : 's'} guardada${savedCount === 1 ? '' : 's'} correctamente.`,
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

  const selectedCourse = selectedFolder
    ? courses.find(course => course.id === selectedFolder.courseId) ?? null
    : null;
  const selectedCategoryLabel = selectedFolder
    ? FOLDER_CATEGORIES.find(category => category.type === selectedFolder.examType)?.label
      ?? LEGACY_CATEGORY_LABELS[selectedFolder.examType]
      ?? 'Archivos'
    : '';
  const selectedFiles = selectedFolder
    ? filesFor(selectedFolder.courseId, selectedFolder.examType)
    : [];

  return (
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(360px,1.1fr)]">
      <section className="overflow-hidden rounded-3xl bg-white shadow-card">
        <div className="border-b border-slate-200 px-5 py-4">
          <h3 className="text-xl font-black text-ink">Biblioteca por ciclos</h3>
          <p className="mt-1 text-xs text-slate-500">
            Despliega un ciclo, elige un curso y abre la carpeta del tipo de evaluación.
          </p>
        </div>

        <div className="divide-y divide-slate-200">
          {cycles.map(cycle => {
            const cycleCourses = courses.filter(course => course.cycle_id === cycle.id);
            const cycleFileCount = files.filter(file => (
              cycleCourses.some(course => course.id === file.course_id)
            )).length;

            return (
              <details className="group/cycle" key={cycle.id}>
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 transition hover:bg-blue-50 [&::-webkit-details-marker]:hidden">
                  <span className="flex min-w-0 items-center gap-3">
                    <span className="text-xl" aria-hidden="true">📁</span>
                    <span className="min-w-0">
                      <span className="block font-black text-ink">Ciclo {cycle.number}</span>
                      <span className="block text-xs text-slate-500">
                        {cycleCourses.length} curso{cycleCourses.length === 1 ? '' : 's'} · {cycleFileCount} archivo{cycleFileCount === 1 ? '' : 's'}
                      </span>
                    </span>
                  </span>
                  <span className="font-black text-royal transition group-open/cycle:rotate-180" aria-hidden="true">⌄</span>
                </summary>

                <div className="border-t border-slate-100 bg-slate-50 px-3 py-3 sm:px-5">
                  <div className="space-y-2">
                    {cycleCourses.map(course => {
                      const courseFiles = files.filter(file => file.course_id === course.id);
                      const legacyCategories = (['quiz', 'other'] as ExamType[])
                        .filter(type => filesFor(course.id, type).length)
                        .map(type => ({ type, label: LEGACY_CATEGORY_LABELS[type] ?? 'Otros materiales' }));
                      const categories = [...FOLDER_CATEGORIES, ...legacyCategories];

                      return (
                        <details className="group/course overflow-hidden rounded-2xl border border-slate-200 bg-white" key={course.id}>
                          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
                            <span className="flex min-w-0 items-center gap-3">
                              <span aria-hidden="true">📂</span>
                              <span className="min-w-0">
                                <span className="block truncate text-sm font-black text-ink">
                                  {course.code || 'Sin código'} — {course.name}
                                </span>
                                <span className="block text-[11px] text-slate-500">
                                  {courseFiles.length} archivo{courseFiles.length === 1 ? '' : 's'}
                                </span>
                              </span>
                            </span>
                            <span className="font-black text-royal transition group-open/course:rotate-180" aria-hidden="true">⌄</span>
                          </summary>

                          <div className="space-y-2 border-t border-slate-100 bg-blue-50/40 p-3">
                            {categories.map(category => {
                              const key = folderKey(course.id, category.type);
                              const isOpen = openCategories.includes(key);
                              const categoryFiles = filesFor(course.id, category.type);
                              const canUpload = FOLDER_CATEGORIES.some(item => item.type === category.type);
                              const inputId = `add-${course.id}-${category.type}`;

                              return (
                                <div className="flex items-center gap-2" key={category.type}>
                                  <button
                                    aria-expanded={isOpen}
                                    className={`flex min-w-0 flex-1 items-center justify-between gap-3 rounded-xl border px-3 py-2.5 text-left transition ${
                                      isOpen
                                        ? 'border-blue-300 bg-blue-100'
                                        : 'border-slate-200 bg-white hover:border-blue-200'
                                    }`}
                                    onClick={() => toggleCategory(course.id, category.type)}
                                    type="button"
                                  >
                                    <span className="min-w-0">
                                      <span className="block truncate text-xs font-black text-ink">{category.label}</span>
                                      <span className="block text-[10px] text-slate-500">
                                        {categoryFiles.length} archivo{categoryFiles.length === 1 ? '' : 's'}
                                      </span>
                                    </span>
                                    <span className={`shrink-0 font-black text-royal transition ${isOpen ? 'rotate-180' : ''}`} aria-hidden="true">⌄</span>
                                  </button>

                                  {canUpload && (
                                    <>
                                      <label
                                        className="shrink-0 cursor-pointer rounded-xl bg-royal px-3 py-2.5 text-xs font-black text-white transition hover:bg-blue-800"
                                        htmlFor={inputId}
                                      >
                                        + Añadir
                                      </label>
                                      <input
                                        accept={ACCEPTED_EXTENSIONS.join(',')}
                                        className="sr-only"
                                        id={inputId}
                                        multiple
                                        onChange={event => selectFiles(course.id, category.type, event)}
                                        type="file"
                                      />
                                    </>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </details>
                      );
                    })}

                    {!cycleCourses.length && (
                      <p className="rounded-xl bg-white p-4 text-center text-sm text-slate-500">
                        No hay cursos registrados en este ciclo.
                      </p>
                    )}
                  </div>
                </div>
              </details>
            );
          })}
        </div>
      </section>

      <aside className="rounded-3xl bg-white p-5 shadow-card lg:sticky lg:top-4">
        {selectedFolder && selectedCourse ? (
          <>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-royal">Carpeta seleccionada</p>
            <h3 className="mt-2 text-xl font-black text-ink">{selectedCategoryLabel}</h3>
            <p className="mt-1 text-sm text-slate-600">
              {selectedCourse.code || 'Sin código'} — {selectedCourse.name}
            </p>

            {uploadDraft
              && uploadDraft.courseId === selectedFolder.courseId
              && uploadDraft.examType === selectedFolder.examType && (
              <section className="mt-5 rounded-2xl border border-blue-200 bg-blue-50 p-4">
                <p className="font-black text-ink">
                  {uploadDraft.files.length} archivo{uploadDraft.files.length === 1 ? '' : 's'} seleccionado{uploadDraft.files.length === 1 ? '' : 's'}
                </p>
                <ul className="mt-2 space-y-1 text-xs text-slate-600">
                  {uploadDraft.files.map(file => (
                    <li className="truncate" key={`${file.name}-${file.lastModified}`}>• {file.name}</li>
                  ))}
                </ul>

                <div className="mt-4 grid gap-3">
                  <label className="text-xs font-bold text-slate-700">
                    Ciclo académico
                    <input
                      className="input mt-1"
                      maxLength={20}
                      onChange={event => setUploadDraft(current => current && ({
                        ...current,
                        academicTerm: event.target.value,
                      }))}
                      placeholder="Ejemplo: 2026-1"
                      value={uploadDraft.academicTerm}
                    />
                  </label>
                  {uploadDraft.files.length === 1 && (
                    <label className="text-xs font-bold text-slate-700">
                      Título personalizado
                      <input
                        className="input mt-1"
                        maxLength={160}
                        onChange={event => setUploadDraft(current => current && ({
                          ...current,
                          title: event.target.value,
                        }))}
                        placeholder="Opcional"
                        value={uploadDraft.title}
                      />
                    </label>
                  )}
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <button className="btn-primary px-4 py-2 text-sm" disabled={pending} onClick={uploadSelectedFiles} type="button">
                    {pending ? 'Guardando…' : 'Guardar en esta carpeta'}
                  </button>
                  <button
                    className="btn-secondary px-4 py-2 text-sm"
                    disabled={pending}
                    onClick={() => {
                      setUploadDraft(null);
                      setMessage(null);
                    }}
                    type="button"
                  >
                    Cancelar
                  </button>
                </div>
              </section>
            )}

            {message && (
              <p className={`mt-4 rounded-xl p-3 text-sm font-bold ${
                message.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800'
                  : 'bg-red-50 text-red-800'
              }`}>
                {message.text}
              </p>
            )}

            <div className="mt-5 space-y-3">
              {selectedFiles.map(file => (
                <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4" key={file.id}>
                  <div className="min-w-0">
                    <h4 className="break-words font-black text-ink">{file.title}</h4>
                    {file.academic_term && (
                      <span className="mt-2 inline-block rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-black uppercase text-amber-900">
                        {file.academic_term}
                      </span>
                    )}
                    <p className="mt-2 break-all text-xs leading-5 text-slate-500">
                      {file.file_name} · {formatBytes(file.file_size)} · {formatDate(file.created_at)}
                    </p>
                  </div>

                  <div className="mt-3 flex items-start gap-2">
                    {file.signed_url ? (
                      <a className="btn-secondary px-3 py-2 text-xs" href={file.signed_url} rel="noreferrer" target="_blank">
                        Abrir
                      </a>
                    ) : (
                      <span className="rounded-xl bg-slate-200 px-3 py-2 text-xs font-bold text-slate-500">No disponible</span>
                    )}
                    <AdminWorksheetDeleteButton fileId={file.id} filePath={file.file_path} />
                  </div>
                </article>
              ))}

              {!selectedFiles.length && (
                <div className="rounded-2xl bg-slate-100 p-6 text-center">
                  <p className="font-black text-ink">Esta carpeta está vacía.</p>
                  <p className="mt-2 text-sm text-slate-500">Usa + Añadir para seleccionar sus primeros archivos.</p>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="grid min-h-72 place-items-center text-center">
            <div>
              <span className="text-4xl" aria-hidden="true">📂</span>
              <h3 className="mt-3 text-xl font-black text-ink">Selecciona una carpeta</h3>
              <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">
                Los archivos aparecerán aquí cuando abras una categoría de evaluación.
              </p>
            </div>
          </div>
        )}
      </aside>
    </div>
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
