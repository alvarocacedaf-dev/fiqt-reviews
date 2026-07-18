'use client';

import { useActionState } from 'react';
import { moderateReview } from '@/app/admin/actions';

export function ReviewModerationForm({ reviewId, professorId }: { reviewId: string; professorId: string }) {
  const [state, action, pending] = useActionState(moderateReview, { ok: false, message: '' });

  return (
    <form action={action} className="mt-4 flex flex-wrap items-center gap-2">
      <input type="hidden" name="id" value={reviewId} />
      <input type="hidden" name="professor_id" value={professorId} />
      <input className="input max-w-xs" name="reason" placeholder="Motivo si se rechaza" />
      <button type="submit" name="status" value="approved" disabled={pending} className="btn-primary disabled:cursor-wait disabled:opacity-60">
        {pending ? 'Guardando…' : 'Aprobar'}
      </button>
      <button type="submit" name="status" value="rejected" disabled={pending} className="btn-secondary disabled:cursor-wait disabled:opacity-60">
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
