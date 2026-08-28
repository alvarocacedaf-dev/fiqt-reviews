import {
  AdminWorksheetLibraryTree,
  AdminWorksheetUploadForm,
} from '@/components/AdminWorksheetLibraryManager';
import { requireAdmin } from '@/lib/admin';
import { isR2Configured } from '@/lib/r2';

type Cycle = {
  id: number;
  number: number;
  name: string;
};

type Course = {
  id: string;
  code: string | null;
  name: string;
  cycle_id: number | null;
};

type WorksheetCountRow = {
  course_id: string;
  exam_type: 'practice' | 'midterm' | 'final' | 'substitute' | 'quiz' | 'other';
};

const COUNT_BATCH_SIZE = 1000;

async function loadFolderCounts(db: Awaited<ReturnType<typeof requireAdmin>>['db']) {
  const folderCounts: Record<string, number> = {};
  let offset = 0;

  while (true) {
    const { data, error } = await db
      .from('admin_worksheets')
      .select('course_id,exam_type')
      .order('id')
      .range(offset, offset + COUNT_BATCH_SIZE - 1);

    if (error) return { folderCounts, total: 0, error };
    const batch = (data ?? []) as WorksheetCountRow[];
    for (const file of batch) {
      const key = `${file.course_id}:${file.exam_type}`;
      folderCounts[key] = (folderCounts[key] ?? 0) + 1;
    }
    if (batch.length < COUNT_BATCH_SIZE) break;
    offset += COUNT_BATCH_SIZE;
  }

  return {
    folderCounts,
    total: Object.values(folderCounts).reduce((sum, count) => sum + count, 0),
    error: null,
  };
}

export default async function AdminWorksheetsPage() {
  const { db } = await requireAdmin();
  const r2Configured = isR2Configured();
  const [
    { data: rawCycles, error: cyclesError },
    { data: rawCourses, error: coursesError },
    fileSummary,
  ] = await Promise.all([
    db.from('cycles').select('id,number,name').gte('number', 1).lte('number', 10).order('number'),
    db.from('courses').select('id,code,name,cycle_id').order('cycle_id').order('code'),
    loadFolderCounts(db),
  ]);

  const cycles = (rawCycles ?? []) as Cycle[];
  const courses = (rawCourses ?? []) as Course[];
  const filesError = fileSummary.error;
  const migrationMissing = filesError?.code === '42P01' || filesError?.code === '42703';

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
            Aplica las migraciones pendientes, incluida <strong>024_admin_worksheets_r2.sql</strong>.
          </p>
        </section>
      ) : (
        <>
          {!r2Configured && (
            <section className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm font-bold text-amber-900">
              Cloudflare R2 todavía no está configurado. Agrega las cuatro variables R2 antes de subir archivos.
            </section>
          )}
          <section className="panel">
            <h2 className="text-2xl font-black text-ink">Agregar planchas</h2>
            <p className="mt-2 text-sm text-slate-600">
              Al seleccionar un curso, sus archivos quedarán agrupados automáticamente en la misma carpeta.
            </p>
            <div className="mt-5">
              <AdminWorksheetUploadForm courses={courses} />
            </div>
          </section>

          <section className="space-y-4">
            <div className="px-1">
              <h2 className="text-2xl font-black text-white">Carpetas de cursos</h2>
              <p className="mt-1 text-sm text-blue-100">
                10 ciclos · {courses.length} cursos · {fileSummary.total} archivo{fileSummary.total === 1 ? '' : 's'}
              </p>
            </div>

            <AdminWorksheetLibraryTree
              courses={courses}
              cycles={cycles}
              files={[]}
              folderCounts={fileSummary.folderCounts}
              paginated
            />

            {(cyclesError || coursesError || filesError) && !migrationMissing && (
              <p className="rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-800">
                No se pudo cargar la biblioteca: {(cyclesError || coursesError || filesError)?.message}
              </p>
            )}
          </section>
        </>
      )}
    </div>
  );
}
