'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/admin';

type AdminDb = Awaited<ReturnType<typeof requireAdmin>>['db'];

const validStatuses = new Set(['pending', 'reviewed']);
const validReportTypes = new Set(['harassment', 'fraud', 'other']);
const validResolutions = new Set(['founded', 'unfounded']);

async function verifyAssistantCode(db: AdminDb, form: FormData) {
  const code = String(form.get('action_code') || '').trim();
  if (!code) {
    return { ok: false as const, message: 'Ingresa el código del asistente.' };
  }

  const { data, error } = await db.rpc('verify_admin_action_code', {
    p_code: code,
    p_scope: 'moderation',
  });
  const actor = Array.isArray(data)
    ? data[0] as { code_id: string; actor_label: string } | undefined
    : undefined;

  if (error) {
    return {
      ok: false as const,
      message: `No se pudo validar el código: ${error.message}`,
    };
  }
  if (!actor) {
    return {
      ok: false as const,
      message: 'El código es incorrecto o está desactivado.',
    };
  }
  return { ok: true as const, label: actor.actor_label };
}

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

  const actor = isPending ? null : await verifyAssistantCode(db, form);
  if (actor && !actor.ok) {
    redirect(`/admin/reportes-chats?error=${encodeURIComponent(actor.message)}`);
  }

  const { error } = await db
    .from('chat_reports')
    .update({
      status,
      reviewed_at: isPending ? null : new Date().toISOString(),
      reviewed_by: isPending ? null : user.id,
      reviewed_by_label: isPending ? null : actor?.label,
      report_type: isPending ? null : reportType,
      resolution: isPending ? null : resolution,
    })
    .eq('id', reportId);

  if (error) {
    redirect(`/admin/reportes-chats?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath('/admin');
  revalidatePath('/admin/reportes-chats');
  revalidatePath('/ciclos');
  revalidatePath('/planchas');
  revalidatePath('/mis-matches');
  redirect(
    `/admin/reportes-chats?success=${encodeURIComponent(
      status === 'reviewed'
        ? 'Reporte marcado como revisado.'
        : 'Reporte devuelto a pendientes.',
    )}`,
  );
}
