'use client';
import { useRef, useState } from 'react';
import type { ExamGeneratorConfig } from '@/lib/examGeneratorConfig';
import { InlineSpinner } from '@/components/ui/InlineSpinner';
type Question = { id: string; sourceTitle: string; originalNumber: number; page: number };
export function PracticeExamGenerator({ available, examCount, config }: { available: number; examCount: number; config: ExamGeneratorConfig }) {
  const [count, setCount] = useState(5);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [busy, setBusy] = useState<'generate' | 'pdf' | null>(null);
  const [error, setError] = useState('');
  const [restarted, setRestarted] = useState(false);
  const lock = useRef(false);
  async function run(kind: 'generate' | 'pdf') {
    if (lock.current) return;
    lock.current = true; setBusy(kind); setError('');
    try {
      const send = () => fetch('/api/practice-exams/physics-pc1' + (kind === 'pdf' ? '/pdf' : '') + '?bank=' + config.key, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(kind === 'pdf' ? { ids: questions.map(q => q.id) } : { count }),
      });
      let response = await send();
      // The server may advance past previously generated combinations in batches.
      // Retry only an explicit pending response, never a failed/network request.
      for (let attempt = 0; response.status === 202 && attempt < 30; attempt++) response = await send();
      if (response.status === 202) throw new Error('Seguimos comprobando tu historial. Pulsa Generar de nuevo para continuar sin repetir exámenes.');
      if (!response.ok) { const result = await response.json(); throw new Error(result.error || 'No se pudo completar la solicitud.'); }
      if (kind === 'generate') { const result = await response.json(); setQuestions(result.questions); setRestarted(result.restarted); }
      else {
        const url = URL.createObjectURL(await response.blob());
        const link = document.createElement('a'); link.href = url; link.download = config.filename;
        document.body.append(link); link.click(); link.remove(); window.setTimeout(() => URL.revokeObjectURL(url), 60000);
      }
    } catch (error) { setError(error instanceof Error ? error.message : 'Vuelve a intentarlo.'); }
    finally { lock.current = false; setBusy(null); }
  }
  return <main className="surface-card mx-auto max-w-4xl p-5 sm:p-8">
    <a className="text-sm font-bold text-royal underline" href="/planchas-administracion">Volver a las planchas</a>
    <p className="mt-5 text-xs font-black uppercase tracking-widest text-royal">Generador de exámenes · Piloto</p>
    <h1 className="mt-2 text-2xl font-black text-ink">{config.courseName} — {config.assessmentName}</h1>
    <p className="mt-3 text-slate-600">Combina preguntas reales de distintos ciclos académicos. Banco de {available} preguntas revisadas de {examCount} exámenes de {config.courseName}.</p>
    <div className="mt-5 flex flex-wrap items-end gap-3">
      <label className="grid gap-2 text-sm font-bold">Cantidad de preguntas
        <select className="rounded-lg border p-2 text-ink" value={count} disabled={!!busy} onChange={e => setCount(Number(e.target.value))}>
          {Array.from({ length: Math.min(6, available) }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}</option>)}
        </select>
      </label>
      <button className="btn-primary flex items-center gap-2 disabled:opacity-60" disabled={!!busy} onClick={() => run('generate')}>{busy === 'generate' && <InlineSpinner />}{busy === 'generate' ? 'Generando…' : questions.length ? 'Generar otro examen' : 'Generar examen'}</button>
    </div>
    {restarted && <p role="status" className="mt-4 text-sm text-royal">Ya completaste todas las combinaciones de esta cantidad de preguntas. Comenzó una nueva ronda.</p>}
    {error && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-red-800">{error}</p>}
    {!!questions.length && <section className="mt-5" aria-label="Examen generado">
      <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <h2 className="text-sm font-black text-ink">{config.generatedTitle}</h2>
        <p role="status" className="mt-1 text-xs text-slate-500">{config.courseName} · PDF · {questions.length} {questions.length === 1 ? 'pregunta' : 'preguntas'}</p>
        <button className="btn-primary mt-3 inline-flex items-center gap-2 disabled:opacity-60" disabled={!!busy} onClick={() => run('pdf')}>
          {busy === 'pdf' && <InlineSpinner />}
          {busy === 'pdf' ? 'Preparando PDF…' : 'Descargar'}
        </button>
      </article>
      <p className="mt-3 text-sm leading-relaxed text-slate-600">Este examen se generó seleccionando al azar {questions.length} {questions.length === 1 ? 'pregunta' : 'preguntas'} de un banco de {available} ejercicios de {config.assessmentName.toLowerCase()} de {config.courseName}, según la cantidad que elegiste. El banco fue preparado con apoyo de IA y revisión de los documentos originales de {examCount} exámenes recopilados. Los solucionarios no se cuentan como exámenes adicionales. Se excluyen los fragmentos sin enunciado completo o con respuestas inseparables.</p>
      {config.physics && <p className="mt-2 text-xs text-slate-500">Algunos recortes conservan anotaciones manuscritas de los documentos originales.</p>}
      <p className="mt-2 text-xs text-slate-500">El PDF incluye la procedencia de las preguntas. Es material de práctica, no un examen oficial.</p>
    </section>}
  </main>;
}
