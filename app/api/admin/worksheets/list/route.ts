import { NextResponse } from 'next/server';
import { getAdminApiContext } from '@/lib/adminApi';
import { createR2PresignedUrl, isR2Configured } from '@/lib/r2';
import { compareAssessmentWorksheetFiles, compareWorksheetTitles } from '@/lib/worksheetSorting';

export const runtime = 'nodejs';

const PAGE_SIZE = 20;
const BATCH_SIZE = 1000;
const ALLOWED_EXAM_TYPES = new Set([
  'practice',
  'midterm',
  'final',
  'substitute',
  'quiz',
  'other',
]);

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

export async function GET(request: Request) {
  const context = await getAdminApiContext();
  if ('error' in context) {
    return NextResponse.json({ error: context.error }, { status: context.status });
  }

  const { searchParams } = new URL(request.url);
  const courseId = searchParams.get('courseId')?.trim();
  const examType = searchParams.get('examType')?.trim();
  const includeAll = searchParams.get('all') === 'true';
  const requestedPage = Number(searchParams.get('page') ?? '1');

  if (!courseId || !examType || !ALLOWED_EXAM_TYPES.has(examType)) {
    return NextResponse.json({ error: 'La carpeta solicitada no es válida.' }, { status: 400 });
  }
  if (!Number.isInteger(requestedPage) || requestedPage < 1) {
    return NextResponse.json({ error: 'La página solicitada no es válida.' }, { status: 400 });
  }

  try {
    const allFiles: WorksheetFile[] = [];
    let offset = 0;

    while (true) {
      const { data, error } = await context.db
        .from('admin_worksheets')
        .select('id,course_id,title,exam_type,academic_term,file_path,file_name,mime_type,file_size,created_at,storage_provider')
        .eq('course_id', courseId)
        .eq('exam_type', examType)
        .order('id')
        .range(offset, offset + BATCH_SIZE - 1);

      if (error) throw new Error(error.message);
      const batch = (data ?? []) as WorksheetFile[];
      allFiles.push(...batch);
      if (batch.length < BATCH_SIZE) break;
      offset += BATCH_SIZE;
    }

    allFiles.sort(
      ['practice', 'midterm', 'final', 'substitute'].includes(examType)
        ? compareAssessmentWorksheetFiles
        : compareWorksheetTitles,
    );

    const total = allFiles.length;
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    const page = Math.min(requestedPage, totalPages);
    const pageFiles = includeAll
      ? allFiles
      : allFiles.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
    const files = await Promise.all(pageFiles.map(async file => {
      if (file.storage_provider === 'r2') {
        return {
          ...file,
          signed_url: isR2Configured() ? createR2PresignedUrl('GET', file.file_path, 3600) : null,
        };
      }

      const { data } = await context.db.storage
        .from('admin-worksheets')
        .createSignedUrl(file.file_path, 3600);
      return { ...file, signed_url: data?.signedUrl ?? null };
    }));

    return NextResponse.json({ files, page, pageSize: PAGE_SIZE, total, totalPages });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'No se pudo cargar la carpeta.',
    }, { status: 500 });
  }
}
