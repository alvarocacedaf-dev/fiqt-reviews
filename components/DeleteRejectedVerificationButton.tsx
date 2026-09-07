'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { deleteRejectedVerification } from '@/app/cursos-verificados/actions';

export function DeleteRejectedVerificationButton({ submissionId }: { submissionId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState('');

  function remove() {
    if (!window.confirm('¿Estás seguro de que deseas eliminar esta verificación rechazada? Esta acción no se puede deshacer.')) {
      return;
    }

    setError('');
    startTransition(async () => {
      const result = await deleteRejectedVerification(submissionId);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div>
      <button
        className="rounded-xl border border-red-300 bg-white px-5 py-3 font-black text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={isPending}
        onClick={remove}
        type="button"
      >
        {isPending ? 'Eliminando…' : 'Eliminar'}
      </button>
      {error && <p className="mt-2 text-sm font-semibold text-red-700" role="alert">{error}</p>}
    </div>
  );
}
