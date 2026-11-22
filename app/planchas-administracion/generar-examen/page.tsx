import { redirect } from 'next/navigation';
import { physicsExamAccess } from '@/lib/physicsExamAccess';
import { physicsPC1Bank } from '@/lib/examQuestionBank';
import { PracticeExamGenerator } from '@/components/PracticeExamGenerator';
export const dynamic = 'force-dynamic';
import pc2 from '@/data/question-banks/bfi01-pc2.json';
export default async function GeneratePracticeExamPage({ searchParams }: { searchParams: Promise<{ practice?: string }> }) {
  const bank = (await searchParams).practice === '2' ? pc2 : physicsPC1Bank;
  const access = await physicsExamAccess();
  if (access === 401) redirect('/login?next=' + encodeURIComponent('/planchas-administracion/generar-examen?practice=' + bank.practiceNumber));
  if (access !== 200) return <main className="surface-card mx-auto max-w-3xl p-6"><h1 className="text-xl font-black">Física I todavía no está habilitado</h1><p className="mt-3">Para generar exámenes necesitas acceso a las planchas de este curso.</p><a className="btn-primary mt-4" href="/planchas-administracion">Volver a las planchas</a></main>;
  return <PracticeExamGenerator available={bank.questions.length} practice={bank.practiceNumber} />;
}
