'use client';
import { useActionState, useMemo, useRef, useState } from 'react';
import { moderateVerification } from '@/app/admin/actions';

type Option = { value: string; courseCode: string; courseName: string; professorName: string; cycleNumber: number };
type Match = { value: string; confidence: number };

export function VerificationApprovalForm({ submissionId, options, ocrEnabled = true }: { submissionId: string; options: Option[]; ocrEnabled?: boolean }) {
  const [approvalState, approvalAction, approvalPending] = useActionState(moderateVerification, { ok: false, message: '' });
  const statusInputRef = useRef<HTMLInputElement>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [scores, setScores] = useState<Record<string, number>>({});
  const [query, setQuery] = useState('');
  const [message, setMessage] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const visible = useMemo(() => options.filter(option => `${option.courseCode} ${option.courseName} ${option.professorName}`.toLowerCase().includes(query.toLowerCase())), [options, query]);
  const ocrMatches = useMemo(() => options.filter(option => scores[option.value] !== undefined), [options, scores]);

  async function analyze() {
    setAnalyzing(true); setMessage('Analizando localmente; la primera vez puede tardar varios minutos…');
    try {
      const response = await fetch('/api/admin/analyze-verification', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ submissionId }) });
      const result = await response.json() as { matches?: Match[]; message?: string; error?: string };
      if (!response.ok) throw new Error(result.error || 'No se pudo analizar.');
      const matches = result.matches ?? [];
      setSelected(new Set(matches.map(match => match.value)));
      setScores(Object.fromEntries(matches.map(match => [match.value, match.confidence])));
      setMessage(matches.length ? `OCR completado: ${matches.length} coincidencia(s). Revísalas antes de aprobar.` : result.message || 'Sin coincidencias seguras.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Falló el OCR local.'); }
    finally { setAnalyzing(false); }
  }

  function toggle(value: string) { setSelected(current => { const next = new Set(current); next.has(value) ? next.delete(value) : next.add(value); return next; }); }

  function setModerationStatus(status: 'approved' | 'rejected') {
    if (statusInputRef.current) statusInputRef.current.value = status;
  }

  return <form action={approvalAction} className="space-y-5">
    <input type="hidden" name="id" value={submissionId} />
    <input ref={statusInputRef} type="hidden" name="status" defaultValue="" />
    {ocrEnabled ? <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
      <p className="font-black text-royal">Asistente OCR local</p>
      <p className="mt-1 text-sm text-slate-600">Premarca coincidencias, pero nunca aprueba automáticamente.</p>
      <button type="button" disabled={analyzing} onClick={analyze} className="btn-primary mt-3">{analyzing ? 'Analizando…' : 'Analizar foto con OCR'}</button>
      {message && <p className="mt-3 text-sm font-semibold text-slate-700">{message}</p>}
      {ocrMatches.length > 0 && <div className="mt-4 rounded-2xl bg-white/80 p-4 shadow-sm">
        <p className="text-sm font-black text-ink">Coincidencias encontradas</p>
        <div className="mt-3 space-y-2">
          {ocrMatches.map(option => <div key={option.value} className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-black text-royal">{option.courseCode} — {option.courseName}</p>
                <p className="mt-1 font-semibold text-slate-700">Profesor: {option.professorName}</p>
              </div>
              <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-1 text-xs font-black text-emerald-800">{scores[option.value]}%</span>
            </div>
          </div>)}
        </div>
      </div>}
    </div> : <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
      <p className="font-black">Revisión manual en la versión web</p>
      <p className="mt-1">Compara la evidencia y marca abajo cada curso y profesor. El asistente OCR continúa disponible únicamente en el servidor local.</p>
    </div>}
    <div>
      <h3 className="font-black text-ink">Cursos y profesores autorizados</h3>
      <p className="mt-1 text-sm text-slate-600">Revisa y corrige las sugerencias antes de aprobar.</p>
      <input value={query} onChange={event => setQuery(event.target.value)} className="input mt-3" placeholder="Buscar curso o profesor" />
      <div className="mt-3 max-h-72 space-y-2 overflow-y-auto rounded-2xl border border-slate-200 p-3">
        {visible.map((option, index) => <div key={option.value}>
          {(index === 0 || visible[index - 1].cycleNumber !== option.cycleNumber) && (
            <div className="sticky top-0 z-10 mb-2 rounded-xl bg-[#071a3d] px-4 py-2 text-sm font-black text-white shadow">
              {option.cycleNumber === 11 ? 'Cursos electivos' : option.cycleNumber === 12 ? 'Cursos complementarios' : `Ciclo ${option.cycleNumber}`}
            </div>
          )}
          <label className={`flex cursor-pointer items-start gap-3 rounded-xl p-3 ${selected.has(option.value) ? 'bg-emerald-50 ring-1 ring-emerald-300' : 'hover:bg-blue-50'}`}>
            <input type="checkbox" name="professor_course_ids" value={option.value} checked={selected.has(option.value)} onChange={() => toggle(option.value)} className="mt-1 h-4 w-4" />
            <span className="min-w-0 flex-1 text-sm"><strong className="text-royal">{option.courseCode} — {option.courseName}</strong><span className="block font-semibold text-slate-700">Profesor: {option.professorName}</span></span>
            {scores[option.value] !== undefined && <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-black text-emerald-800">OCR {scores[option.value]}%</span>}
          </label>
        </div>)}
        {!visible.length && <p className="p-3 text-sm text-red-700">No hay resultados.</p>}
      </div>
      <p className="mt-2 text-sm font-bold text-royal">Seleccionados: {selected.size}</p>
    </div>
    <div className="grid gap-3 sm:grid-cols-2"><label className="text-sm font-semibold">Ciclo académico<input name="academic_term" className="input mt-1" placeholder="Ejemplo: 2026-I" /></label><label className="text-sm font-semibold">Sección<input name="section" className="input mt-1" placeholder="Ejemplo: A" /></label></div>
    <label className="block text-sm font-semibold">Nota para el estudiante<textarea name="notes" className="input mt-1 min-h-24" placeholder="Opcional al aprobar; explica el motivo si rechazas." /></label>
    <label className="block text-sm font-semibold">Código del asistente
      <input required type="password" autoComplete="off" name="action_code" className="input mt-1" placeholder="Código requerido para aprobar o rechazar" />
    </label>
    <div className="rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-950"><strong>Aprobar:</strong> habilita reseñas únicamente para lo marcado.</div>
    {approvalState.message && (
      <p className={`rounded-2xl border p-4 text-sm font-bold ${approvalState.ok ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : 'border-red-200 bg-red-50 text-red-800'}`}>
        {approvalState.message}
      </p>
    )}
    <div className="flex flex-wrap gap-3">
      <button
        type="submit"
        disabled={approvalPending}
        onClick={() => setModerationStatus('approved')}
        className="btn-primary disabled:cursor-wait disabled:opacity-60"
      >
        {approvalPending ? 'Guardando…' : 'Aprobar profesores seleccionados'}
      </button>
      <button
        type="submit"
        disabled={approvalPending}
        onClick={() => setModerationStatus('rejected')}
        className="btn-secondary border-red-200 text-red-700 hover:bg-red-50 disabled:cursor-wait disabled:opacity-60"
      >
        Rechazar evidencia
      </button>
    </div>
  </form>;
}
