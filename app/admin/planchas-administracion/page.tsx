import {
  AdminWorksheetDeleteButton,
  AdminWorksheetUploadForm,
} from '@/components/AdminWorksheetLibraryManager';
import { requireAdmin } from '@/lib/admin';

type Course = {
  id: string;
  code: string | null;
  name: string;
  cycle_id: number | null;
};

type WorksheetFile = {
  id: string;
  course_id: string;
  title: string;
  exam_type: 'practice' | 'midterm' | 'final' | 'quiz' | 'other';
  academic_term: string | null;
  file_path: string;
  file_name: string;
  mime_type: string | null;
  file_size: number;
  created_at: string;
  signed_url?: string | null;
};

const TYPE_LABELS: Record<WorksheetFile['exam_type'], string> = {
  practice: 'Práctica',
  quiz: 'Control o paso',
  midterm: 'Examen parcial',
  final: 'Examen final',
  other: 'Otro',
};

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

export default async function AdminWorksheetsPage() {
  const { db, user } = await requireAdmin();
  const [
    { data: rawCourses, error: coursesError },
    { data: rawFiles, error: filesError },
  ] = await Promise.all([
    db.from('courses').select('id,code,name,cycle_id').order('cycle_id').order('code'),
    db
      .from('admin_worksheets')
      .select('id,course_id,title,exam_type,academic_term,file_path,file_name,mime_type,file_size,created_at')
      .order('created_at', { ascending: false }),
  ]);

  const courses = (rawCourses ?? []) as Course[];
  const files = await Promise.all(
    ((rawFiles ?? []) as WorksheetFile[]).map(async file => {
      const { data } = await db.storage
        .from('admin-worksheets')
        .createSignedUrl(file.file_path, 3600);
      return { ...file, signed_url: data?.signedUrl ?? null };
    }),
  );
  const filesByCourse = files.reduce<Record<string, WorksheetFile[]>>((groups, file) => {
    (groups[file.course_id] ??= []).push(file);
    return groups;
  }, {});
  const folders = courses.filter(course => filesByCourse[course.id]?.length);
  const migrationMissing = filesError?.code === '42P01';

  return (
    <div className="space-y-6">
      <header className="panel">
        <p className="text-sm font-black uppercase tracking-[0.2em] text-royal">Administración</p>
        <h1 className="mt-2 text-3xl font-black text-ink">Planchas de la administración</h1>
        <p className="mt-3 max-w-3xl leading-7 text-slate-600">
          Biblioteca privada de exámenes anteriores organizada en carpetas por curso. Aquí puedes subir,
          consultar y eliminar el material que administrará FIQT Reviews.
        </p>
      </header>

      {migrationMissing ? (
        <section className="panel">
          <p className="font-black text-amber-900">Primero debes aplicar la migración 010 en Supabase.</p>
          <p className="mt-2 text-sm text-slate-600">
            El archivo se llama <strong>010_admin_worksheets.sql</strong>.
          </p>
        </section>
      ) : (
        <>
          <section className="panel">
            <h2 className="text-2xl font-black text-ink">Agregar planchas</h2>
            <p className="mt-2 text-sm text-slate-600">
              Al seleccionar un curso, sus archivos quedarán agrupados automáticamente en la misma carpeta.
            </p>
            <div className="mt-5">
              <AdminWorksheetUploadForm courses={courses} userId={user.id} />
            </div>
          </section>

          <section className="space-y-4">
            <div className="px-1">
              <h2 className="text-2xl font-black text-white">Carpetas de cursos</h2>
              <p className="mt-1 text-sm text-blue-100">
                {folders.length} carpeta{folders.length === 1 ? '' : 's'} · {files.length} archivo{files.length === 1 ? '' : 's'}
              </p>
            </div>

            {folders.map(course => {
              const courseFiles = filesByCourse[course.id] ?? [];
              return (
                <details className="group overflow-hidden rounded-3xl bg-white shadow-card" key={course.id}>
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-6 py-5 [&::-webkit-details-marker]:hidden">
                    <div className="flex min-w-0 items-center gap-4">
                      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-blue-100 text-2xl" aria-hidden="true">📁</span>
                      <div className="min-w-0">
                        <h3 className="truncate text-xl font-black text-ink">
                          {course.code || 'Sin código'} — {course.name}
                        </h3>
                        <p className="mt-1 text-xs font-semibold text-slate-500">
                          {courseFiles.length} plancha{courseFiles.length === 1 ? '' : 's'}
                        </p>
                      </div>
                    </div>
                    <span className="text-xl font-black text-royal transition group-open:rotate-180" aria-hidden="true">⌄</span>
                  </summary>

                  <div className="border-t border-slate-200 p-4 sm:p-6">
                    <div className="grid gap-3">
                      {courseFiles.map(file => (
                        <article className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4" key={file.id}>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h4 className="font-black text-ink">{file.title}</h4>
                              <span className="rounded-full bg-blue-100 px-2.5 py-1 text-[10px] font-black uppercase text-royal">
                                {TYPE_LABELS[file.exam_type]}
                              </span>
                              {file.academic_term && (
                                <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-black uppercase text-amber-900">
                                  {file.academic_term}
                                </span>
                              )}
                            </div>
                            <p className="mt-1 truncate text-xs text-slate-500">
                              {file.file_name} · {formatBytes(file.file_size)} · {formatDate(file.created_at)}
                            </p>
                          </div>

                          <div className="flex items-start gap-2">
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
                    </div>
                  </div>
                </details>
              );
            })}

            {!folders.length && !filesError && (
              <div className="panel text-center">
                <p className="text-xl font-black text-ink">Todavía no hay carpetas con planchas.</p>
                <p className="mt-2 text-sm text-slate-600">
                  Sube el primer examen anterior y su carpeta de curso aparecerá aquí automáticamente.
                </p>
              </div>
            )}

            {(coursesError || filesError) && !migrationMissing && (
              <p className="rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-800">
                No se pudo cargar la biblioteca: {(coursesError || filesError)?.message}
              </p>
            )}
          </section>
        </>
      )}
    </div>
  );
}
