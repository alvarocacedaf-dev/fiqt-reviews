'use client';

import { useActionState, useRef } from 'react';
import { moderateReview } from '@/app/admin/actions';

export function ReviewModerationForm({ reviewId, professorId }: { reviewId: string; professorId: string }) {
  const [state, action, pending] = useActionState(moderateReview, { ok: false, message: '' });
  const statusInputRef = useRef<HTMLInputElement>(null);

  function setModerationStatus(status: 'approved' | 'rejected') {
    if (statusInputRef.current) statusInputRef.current.value = status;
  }

  return (
    <form action={action} className="mt-4 flex flex-wrap items-center gap-2">
      <input type="hidden" name="id" value={reviewId} />
      <input type="hidden" name="professor_id" value={professorId} />
      <input ref={statusInputRef} type="hidden" name="status" defaultValue="" />
      <input className="input max-w-xs" name="reason" placeholder="Motivo si se rechaza" />
      <input required type="password" autoComplete="off" className="input max-w-xs" name="action_code" placeholder="Código del asistente" />
      <button type="submit" disabled={pending} onClick={() => setModerationStatus('approved')} className="btn-primary disabled:cursor-wait disabled:opacity-60">
        {pending ? 'Guardando…' : 'Aprobar'}
      </button>
      <button type="submit" disabled={pending} onClick={() => setModerationStatus('rejected')} className="btn-secondary disabled:cursor-wait disabled:opacity-60">
        {pending ? 'Guardando…' : 'Rechazar'}
      </button>
      {state.message && (
        <p className={`w-full rounded-xl p-3 text-sm font-bold ${state.ok ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-800'}`}>
          {state.message}
        </p>
      )}
    </form>
  );
}
