import { AdminEmptyState } from '@/components/AdminEmptyState';
import { ConfirmRejectDonationButton } from '@/components/ConfirmRejectDonationButton';
import { requireAdmin } from '@/lib/admin';
import { moderateWorksheetDonation } from './actions';

type Donation = {
  id: string;
  user_id: string;
  title: string;
  exam_type: string;
  academic_term: string | null;
  file_name: string;
  file_size: number;
  status: 'pending' | 'approved' | 'rejected';
  moderation_note: string | null;
  created_at: string;
  courses: { code: string | null; name: string } | { code: string | null; name: string }[] | null;
};

const categoryLabels: Record<string, string> = {
  practice: 'Práctica calificada', quiz: 'Control o paso', midterm: 'Examen parcial',
  final: 'Examen final', substitute: 'Examen sustitutorio', other: 'Otro',
};

function relation<T>(value: T | T[] | null) { return Array.isArray(value) ? value[0] ?? null : value; }
function formatBytes(value: number) { return value < 1024 * 1024 ? `${Math.max(1, Math.round(value / 1024))} KB` : `${(value / (1024 * 1024)).toFixed(1)} MB`; }

export default async function WorksheetDonationsAdminPage() {
  const { db } = await requireAdmin();
  const { data, error } = await db
    .from('worksheet_donations')
    .select('id,user_id,title,exam_type,academic_term,file_name,file_size,status,moderation_note,created_at,courses(code,name)')
    .order('status', { ascending: true })
    .order('created_at', { ascending: true });
  const donations = (data ?? []) as unknown as Donation[];
  const userIds = [...new Set(donations.map(item => item.user_id))];
  const { data: profiles } = userIds.length
    ? await db.from('profiles').select('id,full_name,student_code').in('id', userIds)
    : { data: [] };
  const profilesById = Object.fromEntries((profiles ?? []).map(profile => [profile.id, profile]));

  return (
    <div className="space-y-6">
      <header className="panel">
        <p className="text-sm font-black uppercase tracking-[0.2em] text-royal">Moderación</p>
        <h1 className="mt-2 text-3xl font-black text-ink">Donaciones de planchas</h1>
        <p className="mt-3 text-slate-600">Revisa cada archivo antes de incorporarlo a Planchas de la administración.</p>
        {error && <p className="mt-4 rounded-xl bg-red-50 p-3 font-bold text-red-800">{error.message}</p>}
      </header>

      {donations.map(donation => {
        const course = relation(donation.courses);
        const profile = profilesById[donation.user_id];
        return (
          <article className="panel" key={donation.id}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-royal">{profile?.full_name || 'Usuario'} {profile?.student_code ? `· ${profile.student_code}` : ''}</p>
                <h2 className="mt-1 text-xl font-black text-ink">{donation.title}</h2>
                <p className="mt-2 text-sm text-slate-600">{course?.code || 'Sin código'} — {course?.name || 'Curso no encontrado'} · {categoryLabels[donation.exam_type] || donation.exam_type}</p>
                <p className="mt-1 text-sm text-slate-500">{donation.file_name} · {formatBytes(donation.file_size)}{donation.academic_term ? ` · ${donation.academic_term}` : ''}</p>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-black uppercase ${donation.status === 'pending' ? 'bg-amber-100 text-amber-800' : donation.status === 'approved' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                {donation.status === 'pending' ? 'Pendiente' : donation.status === 'approved' ? 'Aprobada' : 'Rechazada'}
              </span>
            </div>

            <a className="mt-4 inline-flex font-bold text-royal underline" href={`/api/admin/worksheet-donations/${donation.id}/download`} target="_blank">Abrir archivo para revisar</a>

            {donation.status === 'pending' && (
              <form action={moderateWorksheetDonation} className="mt-5 grid gap-3">
                <input name="donation_id" type="hidden" value={donation.id} />
                <label className="text-sm font-bold text-slate-700">
                  Código del asistente o propietario
                  <input
                    autoComplete="off"
                    className="input mt-1"
                    name="action_code"
                    placeholder="Código obligatorio para aprobar o rechazar"
                    required
                    type="password"
                  />
                </label>
                <textarea className="input min-h-20" maxLength={500} name="note" placeholder="Nota de moderación (opcional)" />
                <div className="flex flex-wrap gap-3">
                  <button className="btn-primary" name="status" type="submit" value="approved">Aprobar y publicar</button>
                  <ConfirmRejectDonationButton />
                </div>
              </form>
            )}
            {donation.moderation_note && <p className="mt-4 rounded-xl bg-slate-100 p-3 text-sm text-slate-700">Nota: {donation.moderation_note}</p>}
          </article>
        );
      })}

      {!donations.length && !error && <AdminEmptyState description="Las planchas enviadas por los usuarios aparecerán aquí para su revisión." icon="attachment" title="No hay donaciones todavía" />}
    </div>
  );
}
