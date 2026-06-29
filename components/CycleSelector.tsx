import Link from 'next/link';
import type { Cycle } from '@/lib/types';

function cycleLabel(cycle: Cycle) {
  if (cycle.number === 11) return 'Cursos electivos';
  if (cycle.number === 12) return 'Cursos complementarios';
  return `Ciclo ${cycle.number}`;
}

function CycleIcon({ cycleNumber }: { cycleNumber: number }) {
  if (cycleNumber === 11) {
    return (
      <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-50 text-royal">
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
          <path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15Z" />
        </svg>
      </span>
    );
  }

  if (cycleNumber === 12) {
    return (
      <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-50 text-royal">
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="m12 3 2.7 5.47 6.03.88-4.36 4.25 1.03 6-5.4-2.84-5.4 2.84 1.03-6-4.36-4.25 6.03-.88L12 3Z" />
        </svg>
      </span>
    );
  }

  return (
    <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-50 text-royal">
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M22 10 12 5 2 10l10 5 10-5Z" />
        <path d="M6 12v4.5c3.5 2.3 8.5 2.3 12 0V12" />
      </svg>
    </span>
  );
}

export function CycleSelector({ cycles }: { cycles: Cycle[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
      {cycles.map(cycle => (
        <Link
          key={cycle.id}
          href={`/ciclos/${cycle.id}`}
          className="inline-flex items-center justify-center gap-3 rounded-2xl border border-blue-100 bg-white p-4 text-center font-bold text-royal shadow transition hover:-translate-y-1 hover:border-gold"
        >
          <CycleIcon cycleNumber={cycle.number} />
          {cycleLabel(cycle)}
        </Link>
      ))}
    </div>
  );
}
