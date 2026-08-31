import { AdminWorksheetLibraryTree } from '@/components/AdminWorksheetLibraryManager';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { REWARD_THRESHOLDS } from '@/lib/rewardThresholds';

export const dynamic = 'force-dynamic';

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
  file_name: string;
  mime_type: string | null;
  file_size: number;
  created_at: string;
  storage_provider: 'supabase' | 'r2';
};

const FILE_BATCH_SIZE = 1000;

async function loadAllWorksheetFiles(db: ReturnType<typeof createAdminClient>) {
  const files: WorksheetFile[] = [];
  let offset = 0;

  while (true) {
    const { data, error } = await db
      .from('admin_worksheets')
      .select('id,course_id,title,exam_type,academic_term,file_name,mime_type,file_size,created_at,storage_provider')
      .order('created_at', { ascending: false })
      .range(offset, offset + FILE_BATCH_SIZE - 1);

    if (error) return { files: [], error };

    const batch = (data ?? []) as WorksheetFile[];
    files.push(...batch);

    if (batch.length < FILE_BATCH_SIZE) break;
    offset += FILE_BATCH_SIZE;
  }

  return { files, error: null };
}

export default async function PublicAdminWorksheetsPage() {
  const authDb = await createClient();
  const { data: { user } } = await authDb.auth.getUser();
  if (!user) redirect('/login?next=/planchas-administracion');

  const db = createAdminClient();
  const [
    { data: rawCycles, error: cyclesError },
    { data: rawCourses, error: coursesError },
    { files, error: filesError },
    { data: profile },
    { count: approvedReviews },
    { data: rawUnlocks },
  ] = await Promise.all([
    db.from('cycles').select('id,number,name').gte('number', 1).lte('number', 10).order('number'),
    db.from('courses').select('id,code,name,cycle_id').order('cycle_id').order('code'),
    loadAllWorksheetFiles(db),
    db.from('profiles').select('role').eq('id', user.id).single(),
    db.from('reviews').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('status', 'approved'),
    db.from('admin_worksheet_course_unlocks').select('course_id').eq('user_id', user.id),
  ]);

  const cycles = (rawCycles ?? []) as Cycle[];
  const courses = (rawCourses ?? []) as Course[];
  const loadError = cyclesError || coursesError || filesError;
  const reviewCount = approvedReviews ?? 0;
  const isAdmin = profile?.role === 'admin';
  const selectionLimit = isAdmin || reviewCount >= REWARD_THRESHOLDS.allAdminCourses
    ? courses.length
    : reviewCount >= REWARD_THRESHOLDS.twoAdminCourses
      ? 2
      : reviewCount >= REWARD_THRESHOLDS.oneAdminCourse
        ? 1
        : 0;
  const selectedCourseIds = (rawUnlocks ?? []).map(item => item.course_id as string);

  return (
    <main className="mx-auto w-full max-w-6xl space-y-6 px-4 py-8 sm:px-6">
      <header className="panel">
        <p className="text-sm font-black uppercase tracking-[0.2em] text-royal">Biblioteca de planchas</p>
        <h1 className="mt-2 text-3xl font-black text-ink">Planchas de la Administración</h1>
        <p className="mt-3 max-w-3xl leading-7 text-slate-600">
          Consulta el material disponible organizado por ciclo, curso y tipo de evaluación. Esta biblioteca
          se actualiza automáticamente cuando la administración incorpora nuevas planchas.
        </p>
      </header>

      {loadError ? (
        <section className="panel">
          <p className="font-black text-red-800">No se pudo cargar la biblioteca en este momento.</p>
          <p className="mt-2 text-sm text-slate-600">Inténtalo nuevamente dentro de unos minutos.</p>
        </section>
      ) : (
        <section className="space-y-4">
          <div className="px-1">
            <h2 className="text-2xl font-black text-white">Carpetas de cursos</h2>
            <p className="mt-1 text-sm text-blue-100">
              {cycles.length} ciclos · {courses.length} cursos · {files.length} archivo{files.length === 1 ? '' : 's'}
            </p>
          </div>

          <AdminWorksheetLibraryTree
            courses={courses}
            cycles={cycles}
            files={files}
            readOnly
            selectableCourseLimit={selectionLimit}
            selectedCourseIds={selectedCourseIds}
            unlockAllCourses={isAdmin || reviewCount >= REWARD_THRESHOLDS.allAdminCourses}
          />
        </section>
      )}
    </main>
  );
}
