import { redirect } from 'next/navigation';
import { physicsExamAccess } from '@/lib/physicsExamAccess';
import { physicsPC1Bank } from '@/lib/examQuestionBank';
import { PracticeExamGenerator } from '@/components/PracticeExamGenerator';
export const dynamic = 'force-dynamic';
export default async function GeneratePracticeExamPage() {
  const access = await physicsExamAccess();
  if (access === 401) redirect('/login?next=/planchas-administracion/generar-examen');
  if (access !== 200) return <main className="surface-card mx-auto max-w-3xl p-6"><h1 className="text-xl font-black">Física I todavía no está habilitado</h1><p className="mt-3">Para generar exámenes necesitas acceso a las planchas de este curso.</p><a className="btn-primary mt-4" href="/planchas-administracion">Volver a las planchas</a></main>;
  return <PracticeExamGenerator available={physicsPC1Bank.questions.length} />;
}
