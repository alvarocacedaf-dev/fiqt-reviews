'use client';

import { useFormStatus } from 'react-dom';

export function FinishChatButton() {
  const { pending } = useFormStatus();

  return (
    <button
      className="rounded-xl border border-red-200 bg-white px-3 py-2 text-xs font-black text-red-700 transition hover:bg-red-50 disabled:opacity-50"
      disabled={pending}
      onClick={event => {
        if (!window.confirm('¿Finalizar este chat? Ninguno de los participantes podrá enviar más mensajes.')) {
          event.preventDefault();
        }
      }}
      type="submit"
    >
      {pending ? 'Finalizando…' : 'Finalizar chat'}
    </button>
  );
}
