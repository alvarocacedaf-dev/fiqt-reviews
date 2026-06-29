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
      <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-50 text-royal">
        <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M4 5.5c2.7 0 5.2.7 8 2.5v11c-2.8-1.8-5.3-2.5-8-2.5v-11Z" />
          <path d="M20 5.5c-2.7 0-5.2.7-8 2.5v11c2.8-1.8 5.3-2.5 8-2.5v-11Z" />
        </svg>
      </span>
    );
  }

  if (cycleNumber === 12) {
    return (
      <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-50 text-royal">
        <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="m12 3 8 4-8 4-8-4 8-4Z" />
          <path d="m4 12 8 4 8-4" />
          <path d="m4 17 8 4 8-4" />
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
          className={`inline-flex items-center justify-center gap-3 rounded-2xl border border-blue-100 bg-white p-4 text-center font-bold text-royal shadow transition hover:-translate-y-1 hover:border-gold ${
            cycle.number > 10 ? 'col-span-2 whitespace-nowrap sm:col-span-2 sm:px-8' : ''
          }`}
        >
          <CycleIcon cycleNumber={cycle.number} />
          {cycleLabel(cycle)}
        </Link>
      ))}
    </div>
  );
}
