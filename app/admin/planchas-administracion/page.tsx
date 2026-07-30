import {
  AdminWorksheetLibraryTree,
  AdminWorksheetUploadForm,
} from '@/components/AdminWorksheetLibraryManager';
import { requireAdmin } from '@/lib/admin';

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
  signed_url?: string | null;
};

export default async function AdminWorksheetsPage() {
  const { db, user } = await requireAdmin();
  const [
    { data: rawCycles, error: cyclesError },
    { data: rawCourses, error: coursesError },
    { data: rawFiles, error: filesError },
  ] = await Promise.all([
    db.from('cycles').select('id,number,name').gte('number', 1).lte('number', 10).order('number'),
    db.from('courses').select('id,code,name,cycle_id').order('cycle_id').order('code'),
    db
      .from('admin_worksheets')
      .select('id,course_id,title,exam_type,academic_term,file_path,file_name,mime_type,file_size,created_at')
      .order('created_at', { ascending: false }),
  ]);

  const cycles = (rawCycles ?? []) as Cycle[];
  const courses = (rawCourses ?? []) as Course[];
  const files = await Promise.all(
    ((rawFiles ?? []) as WorksheetFile[]).map(async file => {
      const { data } = await db.storage
        .from('admin-worksheets')
        .createSignedUrl(file.file_path, 3600);
      return { ...file, signed_url: data?.signedUrl ?? null };
    }),
  );
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
                10 ciclos · {courses.length} cursos · {files.length} archivo{files.length === 1 ? '' : 's'}
              </p>
            </div>

            <AdminWorksheetLibraryTree
              courses={courses}
              cycles={cycles}
              files={files}
              userId={user.id}
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
