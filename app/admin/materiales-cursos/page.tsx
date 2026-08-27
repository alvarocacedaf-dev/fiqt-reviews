import {
  AdminWorksheetLibraryTree,
  AdminWorksheetUploadForm,
} from '@/components/AdminWorksheetLibraryManager';
import { requireAdmin } from '@/lib/admin';
import { createR2PresignedUrl, isR2Configured } from '@/lib/r2';

type Cycle = { id: number; number: number; name: string };
type Course = { id: string; code: string | null; name: string; cycle_id: number | null };
type MaterialFile = {
  id: string;
  course_id: string;
  title: string;
  material_type: 'books' | 'guided_practice' | 'classes' | 'other';
  academic_term: string | null;
  file_path: string;
  file_name: string;
  mime_type: string | null;
  file_size: number;
  created_at: string;
  storage_provider: 'r2';
};

export default async function AdminCourseMaterialsPage() {
  const { db } = await requireAdmin();
  const r2Configured = isR2Configured();
  const [{ data: rawCycles, error: cyclesError }, { data: rawCourses, error: coursesError }, { data: rawFiles, error: filesError }] = await Promise.all([
    db.from('cycles').select('id,number,name').gte('number', 1).lte('number', 10).order('number'),
    db.from('courses').select('id,code,name,cycle_id').order('cycle_id').order('code'),
    db.from('course_materials')
      .select('id,course_id,title,material_type,academic_term,file_path,file_name,mime_type,file_size,created_at,storage_provider')
      .order('created_at', { ascending: false }),
  ]);

  const cycles = (rawCycles ?? []) as Cycle[];
  const courses = (rawCourses ?? []) as Course[];
  const files = await Promise.all(((rawFiles ?? []) as MaterialFile[]).map(async file => ({
    id: file.id,
    course_id: file.course_id,
    title: file.title,
    exam_type: file.material_type,
    academic_term: file.academic_term,
    file_path: file.file_path,
    file_name: file.file_name,
    mime_type: file.mime_type,
    file_size: file.file_size,
    created_at: file.created_at,
    storage_provider: file.storage_provider,
    signed_url: r2Configured ? createR2PresignedUrl('GET', file.file_path, 3600) : null,
  })));
  const migrationMissing = filesError?.code === '42P01';

  return (
    <div className="space-y-6">
      <header className="panel">
        <p className="text-sm font-black uppercase tracking-[0.2em] text-royal">Administración</p>
        <h1 className="mt-2 text-3xl font-black text-ink">Materiales de los cursos</h1>
        <p className="mt-3 max-w-3xl leading-7 text-slate-600">
          Biblioteca académica organizada por ciclo, curso y tipo de material. Los archivos se almacenan de forma privada en Cloudflare R2.
        </p>
      </header>

      {migrationMissing ? (
        <section className="panel">
          <p className="font-black text-amber-900">Primero debes aplicar la migración 032 en Supabase.</p>
          <p className="mt-2 text-sm text-slate-600">Ejecuta <strong>032_course_materials_library.sql</strong> desde el SQL Editor.</p>
        </section>
      ) : (
        <>
          {!r2Configured && (
            <section className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm font-bold text-amber-900">
              Cloudflare R2 todavía no está configurado. Agrega las cuatro variables R2 antes de subir archivos.
            </section>
          )}
          <section className="panel">
            <h2 className="text-2xl font-black text-ink">Agregar materiales</h2>
            <p className="mt-2 text-sm text-slate-600">Selecciona el curso y clasifica cada archivo como libro, práctica dirigida, clase u otro.</p>
            <div className="mt-5"><AdminWorksheetUploadForm courses={courses} libraryType="materials" /></div>
          </section>

          <section className="space-y-4">
            <div className="px-1">
              <h2 className="text-2xl font-black text-white">Carpetas de cursos</h2>
              <p className="mt-1 text-sm text-blue-100">{cycles.length} ciclos · {courses.length} cursos · {files.length} archivo{files.length === 1 ? '' : 's'}</p>
            </div>
            <AdminWorksheetLibraryTree courses={courses} cycles={cycles} files={files} libraryType="materials" />
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
