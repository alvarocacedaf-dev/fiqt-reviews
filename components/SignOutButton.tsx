'use client';

import { useFormStatus } from 'react-dom';
import { Icon } from '@/components/ui/Icon';
import { InlineSpinner } from '@/components/ui/InlineSpinner';

export function SignOutButton({ variant = 'desktop' }: { variant?: 'desktop' | 'mobile' }) {
  const { pending } = useFormStatus();

  return (
    <button
      aria-disabled={pending}
      className={variant === 'mobile'
        ? 'flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left font-bold text-white transition hover:bg-white/10 hover:text-gold disabled:cursor-wait disabled:opacity-70'
        : 'inline-flex items-center gap-1 font-semibold text-white transition hover:text-gold disabled:cursor-wait disabled:opacity-70'}
      disabled={pending}
      type="submit"
    >
      {pending ? <InlineSpinner /> : <Icon className="h-5 w-5" name="logout" />}
      {pending ? 'Cerrando sesión…' : 'Cerrar sesión'}
    </button>
  );
}
