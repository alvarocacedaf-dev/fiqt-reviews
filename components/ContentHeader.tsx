import type { ReactNode } from 'react';

export function ContentHeader({
  actions,
  description,
  eyebrow,
  title,
  tone = 'light',
}: {
  actions?: ReactNode;
  description?: ReactNode;
  eyebrow: string;
  title: ReactNode;
  tone?: 'dark' | 'light';
}) {
  const dark = tone === 'dark';
  return (
    <header className={dark ? 'mb-6 text-white' : 'panel'}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className={`text-xs font-black uppercase tracking-[0.18em] ${dark ? 'text-gold' : 'text-royal'}`}>
            {eyebrow}
          </p>
          <h1 className={`mt-1 text-3xl font-black sm:text-4xl ${dark ? 'text-white' : 'text-ink'}`}>{title}</h1>
          {description && (
            <div className={`mt-2 max-w-3xl text-sm leading-6 ${dark ? 'text-blue-100' : 'text-slate-600'}`}>
              {description}
            </div>
          )}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
      </div>
    </header>
  );
}

export function ContentToolbar({ children, label }: { children: ReactNode; label?: string }) {
  return (
    <div className="surface-muted flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between">
      {label && <p className="px-1 text-xs font-black uppercase tracking-wider text-slate-500">{label}</p>}
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
