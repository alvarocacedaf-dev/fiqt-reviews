import type { ReactNode } from 'react';

const styles = {
  danger: 'bg-red-100 text-red-800 ring-red-200',
  info: 'bg-blue-100 text-royal ring-blue-200',
  neutral: 'bg-slate-100 text-slate-700 ring-slate-200',
  success: 'bg-emerald-100 text-emerald-800 ring-emerald-200',
  warning: 'bg-amber-100 text-amber-800 ring-amber-200',
};

export function StatusBadge({ children, tone = 'neutral' }: { children: ReactNode; tone?: keyof typeof styles }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-black ring-1 ring-inset ${styles[tone]}`}>
      {children}
    </span>
  );
}
