import {
  AdminWorksheetLibraryTree,
  AdminWorksheetUploadForm,
} from '@/components/AdminWorksheetLibraryManager';
import { requireAdmin } from '@/lib/admin';
import { createR2PresignedUrl, isR2Configured } from '@/lib/r2';

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

type WorksheetFile = {
  id: string;
  course_id: string;
  title: string;
  exam_type: 'practice' | 'midterm' | 'final' | 'substitute' | 'quiz' | 'other';
  academic_term: string | null;
  file_path: string;
  file_name: string;
  mime_type: string | null;
  file_size: number;
  created_at: string;
  storage_provider: 'supabase' | 'r2';
  signed_url?: string | null;
};

export default async function AdminWorksheetsPage() {
  const { db } = await requireAdmin();
  const r2Configured = isR2Configured();
  const [
    { data: rawCycles, error: cyclesError },
    { data: rawCourses, error: coursesError },
    { data: rawFiles, error: filesError },
  ] = await Promise.all([
    db.from('cycles').select('id,number,name').gte('number', 1).lte('number', 10).order('number'),
    db.from('courses').select('id,code,name,cycle_id').order('cycle_id').order('code'),
    db
      .from('admin_worksheets')
      .select('id,course_id,title,exam_type,academic_term,file_path,file_name,mime_type,file_size,created_at,storage_provider')
      .order('created_at', { ascending: false }),
  ]);

  const cycles = (rawCycles ?? []) as Cycle[];
  const courses = (rawCourses ?? []) as Course[];
  const files = await Promise.all(
    ((rawFiles ?? []) as WorksheetFile[]).map(async file => {
      if (file.storage_provider === 'r2') {
        return {
          ...file,
          signed_url: isR2Configured() ? createR2PresignedUrl('GET', file.file_path, 3600) : null,
        };
      }
      const { data } = await db.storage
        .from('admin-worksheets')
        .createSignedUrl(file.file_path, 3600);
      return { ...file, signed_url: data?.signedUrl ?? null };
    }),
  );
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
                10 ciclos · {courses.length} cursos · {files.length} archivo{files.length === 1 ? '' : 's'}
              </p>
            </div>

            <AdminWorksheetLibraryTree
              courses={courses}
              cycles={cycles}
              files={files}
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
