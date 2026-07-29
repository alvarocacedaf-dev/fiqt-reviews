'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/admin';

const validStatuses = new Set(['pending', 'reviewed', 'dismissed']);

export async function updateChatReportStatus(form: FormData) {
  const { db, user } = await requireAdmin();
  const reportId = String(form.get('report_id') || '');
  const status = String(form.get('status') || '');

  if (!reportId || !validStatuses.has(status)) {
    redirect(
      `/admin/reportes-chats?error=${encodeURIComponent('No se recibió una acción válida.')}`,
    );
  }

  const isPending = status === 'pending';
  const { error } = await db
    .from('chat_reports')
    .update({
      status,
      reviewed_at: isPending ? null : new Date().toISOString(),
      reviewed_by: isPending ? null : user.id,
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
        : status === 'dismissed'
          ? 'Reporte descartado.'
          : 'Reporte devuelto a pendientes.',
    )}`,
  );
}
