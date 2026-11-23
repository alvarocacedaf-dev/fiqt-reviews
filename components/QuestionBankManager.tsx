'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { EXAM_GENERATORS, type ExamGeneratorKey } from '@/lib/examGeneratorConfig';
import type { QuestionPage, QuestionRegion } from '@/lib/questionBankReview';

type Job = { id: string; bank_key: ExamGeneratorKey; status: string; error: string; warning: string; worksheet_id: string | null; page_count: number | null; pages: QuestionPage[]; admin_worksheets: { title: string } | null };
type Draft = { id: string; ordinal: number; version: number; status: string; extracted_text: string; regions: QuestionRegion[]; question: { originalNumber: number; containsAnnotations: boolean } | null };
const labels: Record<string, string> = { queued: 'En cola', processing: 'Procesando', review: 'Por revisar', waiting_pdf: 'Necesita PDF', failed: 'Requiere atención', done: 'Revisión finalizada' };
const api = '/api/admin/question-bank';
async function getJson(url: string, body?: unknown) {
  const response = await fetch(url, body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : { cache: 'no-store' });
  const value = await response.json();
  if (!response.ok) throw new Error(value.error || 'No se pudo completar la solicitud.');
  return value;
}

export function QuestionBankManager() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selected, setSelected] = useState('');
  const [job, setJob] = useState<Job | null>(null);
  const [questions, setQuestions] = useState<Draft[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const refresh = useCallback(async () => {
    try {
      if (selected) { const result = await getJson(`${api}?id=${selected}`); setJob(result.job); setQuestions(result.questions); }
      else { const result = await getJson(api); setJobs(result.jobs); setJob(null); }
    } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo cargar.'); }
  }, [selected]);
  useEffect(() => { setError(''); void refresh(); }, [refresh]);
  useEffect(() => {
    if (!job || !['queued','processing'].includes(job.status)) return;
    const timer = setInterval(() => void refresh(), 8000);
    return () => clearInterval(timer);
  }, [job, refresh]);
  async function action(action: string) {
    if (lock.current || !job) return;
    lock.current = true; setBusy(true); setError('');
    try { await getJson(api, { id: job.id, action }); await refresh(); }
    catch (e) { setError(e instanceof Error ? e.message : 'No se pudo guardar.'); }
    finally { lock.current = false; setBusy(false); }
  }
  return <main className="surface-card space-y-5 p-5 sm:p-8">
    <h1 className="text-2xl font-black">Banco de preguntas</h1>
    <p className="text-sm text-slate-600">Los nuevos exámenes de Física I (PC1 y PC2) y finales de Química Orgánica I se procesan al subirlos en Administrar planchas. Revisa cada enunciado y sus figuras antes de aprobar. Las preguntas aprobadas entran al generador inmediatamente.</p>
    {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-red-800">{error}</p>}
    <div className="flex gap-3"><a className="text-sm font-bold text-royal underline" href="/admin/planchas-administracion">Subir examen o asociar PDF</a><button className="text-sm underline" onClick={() => void refresh()}>Actualizar</button></div>
    {!job && !selected && <div className="space-y-3">
      {!jobs.length && <p>Aún no hay nuevos exámenes en procesamiento. El banco existente sigue disponible.</p>}
      {jobs.map(j => <button key={j.id} className="block w-full rounded-xl border p-4 text-left hover:bg-slate-50" onClick={() => setSelected(j.id)}>
        <strong>{j.admin_worksheets?.title || EXAM_GENERATORS[j.bank_key].assessmentName}</strong><span className="mt-1 block text-sm text-royal">{labels[j.status]}</span>
      </button>)}
    </div>}
    {job && <>
      <button className="text-sm underline" onClick={() => { setSelected(''); setJob(null); }}>Volver a los exámenes</button>
      <h2 className="text-xl font-bold">{job.admin_worksheets?.title || 'Examen original retirado'}</h2>
      <p role="status" className="font-semibold text-royal">{labels[job.status]}{job.page_count ? ` · ${job.pages.length}/${job.page_count} páginas procesadas` : ''}</p>
      {job.warning && <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">{job.warning}</p>}
      {job.error && <p role="alert" className="text-red-800">{job.error}</p>}
      {job.worksheet_id && <a className="text-sm underline" href={`/api/admin-worksheets/${job.worksheet_id}/download`} target="_blank" rel="noreferrer">Abrir original</a>}
      {['failed','waiting_pdf'].includes(job.status) && <button disabled={busy} className="btn-primary ml-3" onClick={() => void action('retry')}>Reintentar procesamiento</button>}
      {job.status === 'review' && <>
        <p className="text-sm">Comprueba que no se incluyan soluciones ni ejercicios repetidos. La detección automática propone recortes; puede confundir incisos o documentos con varias columnas.</p>
        <div className="flex flex-wrap gap-3"><button disabled={busy} className="btn-primary" onClick={() => void action('add')}>Añadir pregunta manualmente</button>
          <button disabled={busy || questions.some(q => q.status === 'draft')} className="btn-primary disabled:opacity-50" onClick={() => void action('finish')}>Finalizar revisión</button></div>
      </>}
      <div className="space-y-6">{questions.map(q => <QuestionEditor key={`${q.id}:${q.version}`} draft={q} job={job} onSaved={refresh} />)}</div>
    </>}
  </main>;
}

function QuestionEditor({ draft, job, onSaved }: { draft: Draft; job: Job; onSaved: () => Promise<void> }) {
  const [regions, setRegions] = useState(draft.regions);
  const [number, setNumber] = useState(draft.question?.originalNumber ?? Number(draft.extracted_text.match(/\d+/)?.[0] || draft.ordinal));
  const [annotations, setAnnotations] = useState(draft.question?.containsAnnotations ?? false);
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(regions[0]?.page || 1);
  const lock = useRef(false);
  const start = useRef<{ x: number; y: number } | null>(null);
  async function save(action: string) {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError('');
    try { await getJson(`${api}/question`, { id: draft.id, version: draft.version, action, number, regions, annotations, confirmed }); await onSaved(); }
    catch (e) { setError(e instanceof Error ? e.message : 'No se pudo guardar.'); }
    finally { lock.current = false; setBusy(false); }
  }
  if (draft.status !== 'draft') return <article className="rounded-xl border p-4"><strong>Pregunta {draft.question?.originalNumber || draft.ordinal}</strong><p className="text-sm">{draft.status === 'approved' ? 'Aprobada · Ya disponible en el generador' : 'Descartada · No entra al generador'}</p></article>;
  return <article className="space-y-3 rounded-xl border p-4">
    <h3 className="font-bold">Borrador {draft.ordinal}</h3>
    {draft.extracted_text && <p className="text-xs text-slate-500">Texto detectado: {draft.extracted_text}</p>}
    <label className="block text-sm">Número de pregunta original <input className="ml-2 w-20 rounded border p-2" type="number" min={1} max={100} value={number} onChange={e => setNumber(Number(e.target.value))} /></label>
    {draft.question && <div><p className="text-sm font-semibold">Último recorte guardado</p>{/* eslint-disable-next-line @next/next/no-img-element */}<img alt="Vista previa del recorte guardado" className="max-h-[500px] max-w-full object-contain" src={`${api}/asset?question=${draft.id}&v=${draft.version}`} /></div>}
    <details>
      <summary className="cursor-pointer font-semibold text-royal">Revisar páginas y ajustar recortes</summary>
      <p className="my-2 text-sm">Selecciona una página y arrastra sobre ella para añadir un recorte. Elimina los recortes sobrantes. Si una pregunta continúa en otra página, añade ambos en orden.</p>
      <select aria-label="Página original" className="mb-2 rounded border p-2" value={page} onChange={e => setPage(Number(e.target.value))}>{job.pages.map(p => <option key={p.page} value={p.page}>Página {p.page}</option>)}</select>
      <div className="relative touch-none select-none border" onPointerDown={e => {
        const rect = e.currentTarget.getBoundingClientRect(); start.current = { x: (e.clientX - rect.left) / rect.width, y: (e.clientY - rect.top) / rect.height }; e.currentTarget.setPointerCapture(e.pointerId);
      }} onPointerUp={e => {
        const from = start.current; start.current = null; if (!from) return;
        const rect = e.currentTarget.getBoundingClientRect(); const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)), y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
        const width = Math.abs(x - from.x), height = Math.abs(y - from.y);
        if (width > .01 && height > .01) { setRegions(r => [...r, { page, left: Math.min(x, from.x), top: Math.min(y, from.y), width, height }]); setConfirmed(false); }
      }} onPointerCancel={() => { start.current = null; }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}<img alt={`Página ${page}. Arrastra para seleccionar un recorte.`} draggable={false} className="block w-full" src={`${api}/asset?job=${job.id}&page=${page}`} />
        {regions.map((r, i) => r.page === page && <div key={i} className="pointer-events-none absolute border-2 border-blue-600 bg-blue-400/10" style={{ left: `${r.left * 100}%`, top: `${r.top * 100}%`, width: `${r.width * 100}%`, height: `${r.height * 100}%` }}><span className="bg-blue-700 px-1 text-xs text-white">{i + 1}</span></div>)}
      </div>
    </details>
    <div className="space-y-2">{regions.map((r, index) => <div className="flex flex-wrap items-end gap-2 rounded-lg bg-slate-50 p-2" key={index}>
      <span className="text-xs">Recorte {index + 1} · pág. {r.page}</span>
      {(['left','top','width','height'] as const).map((field, i) => <label className="text-xs" key={field}>{['Izquierda %','Arriba %','Ancho %','Alto %'][i]}<input className="ml-1 w-16 rounded border p-1" type="number" step="0.1" min="0" max="100" value={Number((r[field] * 100).toFixed(2))} onChange={e => { setRegions(current => current.map((x, n) => n === index ? { ...x, [field]: Number(e.target.value) / 100 } : x)); setConfirmed(false); }} /></label>)}
      <button className="text-xs text-red-800 underline" onClick={() => { setRegions(current => current.filter((_, n) => n !== index)); setConfirmed(false); }}>Quitar recorte</button>
    </div>)}</div>
    <label className="block text-sm"><input type="checkbox" checked={annotations} onChange={e => setAnnotations(e.target.checked)} /> Conserva anotaciones manuscritas que no revelan la solución.</label>
    <label className="block text-sm"><input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} /> Revisé todos los recortes: enunciado completo, figuras e incisos incluidos, sin soluciones y sin duplicar una pregunta del banco.</label>
    {error && <p role="alert" className="text-sm text-red-800">{error}</p>}
    <div className="flex flex-wrap gap-3">
      <button disabled={busy} className="btn-primary disabled:opacity-50" onClick={() => void save('save')}>{busy ? 'Guardando…' : 'Guardar y ver recorte'}</button>
      <button disabled={busy || !confirmed} className="btn-primary disabled:opacity-50" onClick={() => void save('approve')}>Aprobar y publicar</button>
      <button disabled={busy} className="text-sm text-red-800 underline" onClick={() => void save('discard')}>Descartar</button>
    </div>
  </article>;
}
