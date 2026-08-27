import Link from 'next/link';
import { ContentHeader } from '@/components/ContentHeader';
import { CourseMaterialFolders, type CourseMaterialFile } from '@/components/CourseMaterialFolders';
import { Icon } from '@/components/ui/Icon';
import { createB2PresignedUrl, isB2Configured } from '@/lib/b2';
import { getCourse } from '@/lib/data';
import { getBundledMaterialsForCourse } from '@/lib/bundledCourseMaterials';
import { createR2PresignedUrl, isR2Configured } from '@/lib/r2';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export default async function CourseMaterialPage({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = await params;
  const course = await getCourse(courseId);
  const db = createAdminClient();
  const { data: rawFiles, error } = await db.from('course_materials')
    .select('id,title,material_type,academic_term,file_name,mime_type,file_size,created_at,file_path,storage_provider')
    .eq('course_id', courseId)
    .order('created_at', { ascending: false });
  const r2Configured = isR2Configured();
  const b2Configured = isB2Configured();
  const storedFiles = ((rawFiles ?? []) as (Omit<CourseMaterialFile, 'signed_url'> & { file_path: string; storage_provider: 'r2' | 'b2' })[])
    .map(file => ({
      id: file.id,
      title: file.title,
      material_type: file.material_type,
      academic_term: file.academic_term,
      file_name: file.file_name,
      mime_type: file.mime_type,
      file_size: file.file_size,
      created_at: file.created_at,
      signed_url: file.storage_provider === 'b2'
        ? (b2Configured ? createB2PresignedUrl('GET', file.file_path, 3600) : null)
        : (r2Configured ? createR2PresignedUrl('GET', file.file_path, 3600) : null),
    }));
  const bundledFiles: CourseMaterialFile[] = getBundledMaterialsForCourse(course?.code).map(material => ({
    id: `bundled:${material.id}`,
    title: material.title,
    material_type: material.materialType,
    academic_term: null,
    file_name: material.fileName,
    mime_type: material.mimeType,
    file_size: material.fileSize,
    created_at: '2026-08-27T00:00:00.000Z',
    signed_url: material.fileUrl,
  }));
  const files = [...storedFiles, ...bundledFiles];

  return (
    <section>
      <ContentHeader
        description="Consulta libros, prácticas dirigidas, clases y otros archivos compartidos por la administración."
        eyebrow={course?.code ?? 'Material académico'}
        title={`Material de ${course?.name ?? 'curso'}`}
        tone="dark"
      />

      {error ? (
        <div className="panel max-w-3xl">
          <p className="font-black text-amber-900">La biblioteca de materiales todavía no está disponible.</p>
          <p className="mt-2 text-sm text-slate-600">La administración debe aplicar la migración 032 en Supabase.</p>
        </div>
      ) : <CourseMaterialFolders files={files} />}

      <div className="mt-5">
        <Link className="btn-secondary gap-2" href={`/cursos/${courseId}`}>
          <Icon className="h-4 w-4" name="arrow-left" />
          Volver al curso
        </Link>
      </div>
    </section>
  );
}
