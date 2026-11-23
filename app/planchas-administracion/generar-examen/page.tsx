import { notFound, redirect } from 'next/navigation';
import { physicsExamAccess } from '@/lib/physicsExamAccess';
import { getExamBank } from '@/lib/examQuestionBank';
import { EXAM_GENERATORS, examGeneratorKey } from '@/lib/examGeneratorConfig';
import { PracticeExamGenerator } from '@/components/PracticeExamGenerator';
import { getLiveExamBank } from '@/lib/liveExamBank';
export const dynamic = 'force-dynamic';

export default async function GeneratePracticeExamPage({ searchParams }: { searchParams: Promise<{ practice?: string; bank?: string }> }) {
  const key = examGeneratorKey(await searchParams);
  if (!key) notFound();
  const bank = getExamBank(key);
  const access = await physicsExamAccess(bank.courseId);
  if (access === 401) redirect('/login?next=' + encodeURIComponent('/planchas-administracion/generar-examen?bank=' + key));
  if (access !== 200) return <main className="surface-card mx-auto max-w-3xl p-6"><h1 className="text-xl font-black">Necesitas habilitar {bank.courseName}</h1><p className="mt-3">Para generar exámenes necesitas acceso a las planchas de este curso.</p><a className="btn-primary mt-4" href="/planchas-administracion">Volver a las planchas</a></main>;
  try {
    const live = await getLiveExamBank(key);
    return <PracticeExamGenerator available={live.questions.length} examCount={live.examCount} config={EXAM_GENERATORS[key]} />;
  } catch {
    return <main className="surface-card p-6">No se pudo cargar el banco de preguntas. Vuelve a intentarlo en unos momentos.</main>;
  }
}
