import Link from 'next/link';
import type { Cycle } from '@/lib/types';

function cycleLabel(cycle: Cycle) {
  if (cycle.number === 11) return 'Cursos electivos';
  if (cycle.number === 12) return 'Cursos complementarios';
  return `Ciclo ${cycle.number}`;
}

export function CycleSelector({ cycles }: { cycles: Cycle[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
      {cycles.map(cycle => (
        <Link
          key={cycle.id}
          href={`/ciclos/${cycle.id}`}
          className="rounded-2xl border border-blue-100 bg-white p-5 text-center font-bold text-royal shadow transition hover:-translate-y-1 hover:border-gold"
        >
          {cycleLabel(cycle)}
        </Link>
      ))}
    </div>
  );
}
