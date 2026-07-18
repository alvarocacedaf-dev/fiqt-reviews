import { requireAdmin } from '@/lib/admin';
import { associateProfessor, saveProfessor } from '../actions';

type PageProps = { searchParams: Promise<{ error?: string; success?: string }> };

export default async function AdminProfessors({ searchParams }: PageProps) {
  const { error, success } = await searchParams;
  const { db } = await requireAdmin();
  const [{ data }, { data: courses }] = await Promise.all([
    db.from('professors').select('*').order('full_name'),
    db.from('courses').select('id,name,code').order('name'),
  ]);

  return <div className="panel">
    <h1 className="text-2xl font-black text-ink">Profesores</h1>
    {error && <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-bold text-red-800">{error}</p>}
    {success && <p className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm font-bold text-emerald-800">{success}</p>}
    <form action={saveProfessor} className="mt-5 flex flex-wrap gap-2">
      <input name="full_name" required className="input min-w-64 flex-1" placeholder="Nombre ficticio o validado" />
      <input required type="password" autoComplete="off" name="action_code" className="input max-w-xs" placeholder="Código del propietario" />
      <button className="btn-primary">Crear profesor</button>
    </form>
    <div className="mt-6 space-y-4">{data?.map(professor => <div className="rounded-xl border p-3" key={professor.id}>
      <form action={saveProfessor} className="flex flex-wrap gap-2">
        <input type="hidden" name="id" value={professor.id} />
        <input required className="input min-w-64 flex-1" name="full_name" defaultValue={professor.full_name} />
        <input required type="password" autoComplete="off" name="action_code" className="input max-w-xs" placeholder="Código del propietario" />
        <button className="btn-secondary">Guardar</button>
      </form>
      <form action={associateProfessor} className="mt-2 flex flex-wrap gap-2">
        <input type="hidden" name="professor_id" value={professor.id} />
        <select name="course_id" className="input max-w-xs">{courses?.map(course => <option value={course.id} key={course.id}>{course.code} — {course.name}</option>)}</select>
        <input className="input w-24" name="academic_term" placeholder="2026-I" />
        <input className="input w-20" name="section" placeholder="Sec." />
        <input required type="password" autoComplete="off" name="action_code" className="input max-w-xs" placeholder="Código del propietario" />
        <button className="btn-primary">Asociar curso</button>
      </form>
    </div>)}</div>
  </div>;
}
