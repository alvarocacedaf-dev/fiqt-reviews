'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/admin';

const validStatuses = new Set(['pending', 'reviewed']);
const validReportTypes = new Set(['harassment', 'fraud', 'other']);
const validResolutions = new Set(['founded', 'unfounded']);

export async function updateChatReportStatus(form: FormData) {
  const { db, user } = await requireAdmin();
  const reportId = String(form.get('report_id') || '');
  const status = String(form.get('status') || '');
  const reportType = String(form.get('report_type') || '');
  const resolution = String(form.get('resolution') || '');

  if (!reportId || !validStatuses.has(status)) {
    redirect(
      `/admin/reportes-chats?error=${encodeURIComponent('No se recibió una acción válida.')}`,
    );
  }

  const isPending = status === 'pending';
  if (
    !isPending
    && (!validReportTypes.has(reportType) || !validResolutions.has(resolution))
  ) {
    redirect(
      `/admin/reportes-chats?error=${encodeURIComponent(
        'Selecciona el tipo de reporte y si es fundado o infundado.',
      )}`,
    );
  }

  const { error } = await db
    .from('chat_reports')
    .update({
      status,
      reviewed_at: isPending ? null : new Date().toISOString(),
      reviewed_by: isPending ? null : user.id,
      report_type: isPending ? null : reportType,
      resolution: isPending ? null : resolution,
    })
    .eq('id', reportId);

  if (error) {
    redirect(`/admin/reportes-chats?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath('/admin');
  revalidatePath('/admin/reportes-chats');
  redirect(
    `/admin/reportes-chats?success=${encodeURIComponent(
      status === 'reviewed'
        ? 'Reporte marcado como revisado.'
        : 'Reporte devuelto a pendientes.',
    )}`,
  );
}
