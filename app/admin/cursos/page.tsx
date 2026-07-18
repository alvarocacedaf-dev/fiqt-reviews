import { requireAdmin } from '@/lib/admin';
import { saveCourse } from '../actions';

type PageProps = { searchParams: Promise<{ error?: string; success?: string }> };

export default async function AdminCourses({ searchParams }: PageProps) {
  const { error, success } = await searchParams;
  const { db } = await requireAdmin();
  const [{ data: courses }, { data: cycles }] = await Promise.all([
    db.from('courses').select('*').order('name'),
    db.from('cycles').select('*').order('number'),
  ]);
  const form = (course?: { id: string; code: string | null; name: string; cycle_id: number }) => (
    <form action={saveCourse} className="grid gap-2 rounded-xl border p-3 lg:grid-cols-[1fr_2fr_1fr_1.5fr_auto]">
      <input type="hidden" name="id" value={course?.id} />
      <input name="code" className="input" defaultValue={course?.code ?? ''} placeholder="Código" />
      <input required name="name" className="input" defaultValue={course?.name} placeholder="Nombre" />
      <select name="cycle_id" className="input" defaultValue={course?.cycle_id ?? ''}>{cycles?.map(cycle => <option value={cycle.id} key={cycle.id}>Ciclo {cycle.number}</option>)}</select>
      <input required type="password" autoComplete="off" name="action_code" className="input" placeholder="Código del propietario" />
      <button className="btn-secondary">Guardar</button>
    </form>
  );

  return <div className="panel">
    <h1 className="text-2xl font-black text-ink">Cursos</h1>
    {error && <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-bold text-red-800">{error}</p>}
    {success && <p className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm font-bold text-emerald-800">{success}</p>}
    <div className="mt-5">{form()}</div>
    <div className="mt-5 space-y-2">{courses?.map(course => <div key={course.id}>{form(course)}</div>)}</div>
  </div>;
}
