'use client';
import { useRef, useState } from 'react';
import { InlineSpinner } from '@/components/ui/InlineSpinner';
type Question = { id: string; sourceTitle: string; originalNumber: number; page: number };
export function PracticeExamGenerator({ available }: { available: number }) {
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
      const response = await fetch('/api/practice-exams/physics-pc1' + (kind === 'pdf' ? '/pdf' : ''), {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(kind === 'pdf' ? { ids: questions.map(q => q.id) } : { count }),
      });
      if (!response.ok) { const result = await response.json(); throw new Error(result.error || 'No se pudo completar la solicitud.'); }
      if (kind === 'generate') { const result = await response.json(); setQuestions(result.questions); setRestarted(result.restarted); }
      else {
        const url = URL.createObjectURL(await response.blob());
        const link = document.createElement('a'); link.href = url; link.download = 'Fisica-I-PC1-examen-de-practica.pdf';
        document.body.append(link); link.click(); link.remove(); window.setTimeout(() => URL.revokeObjectURL(url), 60000);
      }
    } catch (error) { setError(error instanceof Error ? error.message : 'Vuelve a intentarlo.'); }
    finally { lock.current = false; setBusy(null); }
  }
  return <main className="surface-card mx-auto max-w-4xl p-5 sm:p-8">
    <a className="text-sm font-bold text-royal underline" href="/planchas-administracion">Volver a las planchas</a>
    <p className="mt-5 text-xs font-black uppercase tracking-widest text-royal">Generador de exámenes · Piloto</p>
    <h1 className="mt-2 text-2xl font-black text-ink">Física I — Práctica calificada 1</h1>
    <p className="mt-3 text-slate-600">Combina preguntas reales de distintos ciclos académicos. Banco inicial de {available} preguntas revisadas; todavía no incluye todos los archivos de PC1.</p>
    <div className="mt-5 flex flex-wrap items-end gap-3">
      <label className="grid gap-2 text-sm font-bold">Cantidad de preguntas
        <select className="rounded-lg border p-2 text-ink" value={count} disabled={!!busy} onChange={e => setCount(Number(e.target.value))}>
          {Array.from({ length: Math.min(10, available) }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}</option>)}
        </select>
      </label>
      <button className="btn-primary flex items-center gap-2 disabled:opacity-60" disabled={!!busy} onClick={() => run('generate')}>{busy === 'generate' && <InlineSpinner />}{busy === 'generate' ? 'Generando…' : questions.length ? 'Generar otro examen' : 'Generar examen'}</button>
      {!!questions.length && <button className="btn-primary flex items-center gap-2 disabled:opacity-60" disabled={!!busy} onClick={() => run('pdf')}>{busy === 'pdf' && <InlineSpinner />}{busy === 'pdf' ? 'Preparando PDF…' : 'Descargar este examen en PDF'}</button>}
    </div>
    {restarted && <p role="status" className="mt-4 text-sm text-royal">Ya completaste todas las combinaciones de esta cantidad de preguntas. Comenzó una nueva ronda.</p>}
    {error && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-red-800">{error}</p>}
    {!!questions.length && <>
      <p role="status" className="mt-5 text-sm text-slate-600">{questions.length} preguntas sin repetir. Resuelve en una hoja aparte. Los recortes conservan su numeración original; usa el orden de los encabezados. Usa g = 9,8 m/s² cuando haga falta y no se indique otro valor.</p>
      <div className="mt-5 space-y-6">{questions.map((q, i) => <article key={q.id} className="rounded-xl border p-4">
        <h2 className="mb-3 font-black text-ink">Pregunta {i + 1}</h2>
        {/* Original crops keep equations and figures intact. Private endpoint checks course access. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="mx-auto h-auto max-w-full" src={'/api/practice-exams/physics-pc1/question?id=' + encodeURIComponent(q.id)} alt={'Enunciado de la pregunta ' + (i + 1) + ', original ' + q.originalNumber} onError={() => setError('Una pregunta no pudo cargarse. Recarga la página antes de resolver el examen.')} />
      </article>)}</div>
      <details className="mt-6 rounded-xl bg-slate-50 p-4"><summary className="cursor-pointer font-bold">Procedencia de las preguntas</summary><ol className="mt-3 list-decimal space-y-2 pl-5 text-sm">{questions.map(q => <li key={q.id}>{q.sourceTitle} · Pregunta original {q.originalNumber}, página {q.page}.</li>)}</ol></details>
      <p className="mt-4 text-xs text-slate-500">Material de práctica, no es un examen oficial. Este piloto no incluye respuestas ni calificación automática.</p>
    </>}
  </main>;
}
