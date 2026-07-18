import { requireAdmin } from '@/lib/admin';
import { saveCycle } from '../actions';

type Cycle = { id: number; number: number; name: string };
type PageProps = { searchParams: Promise<{ error?: string; success?: string }> };

export default async function AdminCycles({ searchParams }: PageProps) {
  const { error, success } = await searchParams;
  const { db } = await requireAdmin();
  const { data } = await db.from('cycles').select('*').order('number');
  const form = (cycle?: Cycle) => (
    <form action={saveCycle} className="flex flex-wrap gap-2 rounded-xl border p-3">
      <input type="hidden" name="id" value={cycle?.id} />
      <input required className="input w-24" type="number" min="1" max="10" name="number" defaultValue={cycle?.number} placeholder="#" />
      <input required className="input min-w-48 flex-1" name="name" defaultValue={cycle?.name} placeholder="Nombre del ciclo" />
      <input required type="password" autoComplete="off" className="input max-w-xs" name="action_code" placeholder="Código del propietario" />
      <button className="btn-secondary">Guardar</button>
    </form>
  );

  return <div className="panel">
    <h1 className="text-2xl font-black text-ink">Ciclos</h1>
    {error && <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-bold text-red-800">{error}</p>}
    {success && <p className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm font-bold text-emerald-800">{success}</p>}
    <div className="mt-5">{form()}</div>
    <div className="mt-4 space-y-2">{data?.map(cycle => <div key={cycle.id}>{form(cycle)}</div>)}</div>
  </div>;
}
