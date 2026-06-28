import { CycleSelector } from '@/components/CycleSelector';
import { getCycles } from '@/lib/data';

export default async function CyclesPage() {
  const cycles = await getCycles();

  return (
    <section className="panel">
      <p className="text-sm font-bold text-royal">RUTA ACADÉMICA</p>
      <h1 className="mt-1 text-3xl font-black text-ink">Explora por ciclo</h1>
      <p className="mt-2 text-slate-600">Selecciona el ciclo o tipo de curso que quieres consultar.</p>
      <div className="mt-7">
        <CycleSelector cycles={cycles} />
      </div>
      {!cycles.length && (
        <p className="mt-6 rounded-xl bg-amber-50 p-4 text-amber-900">
          Aún no hay ciclos cargados. Ejecuta la migración y sus datos de ejemplo en Supabase.
        </p>
      )}
    </section>
  );
}
