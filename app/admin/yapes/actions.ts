'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/admin';

export async function moderateContribution(form: FormData) {
  const { db, user } = await requireAdmin();
  const id = String(form.get('id') || '');
  const status = String(form.get('status') || '');
  const actionCode = String(form.get('action_code') || '').trim();

  if (!id || !['approved', 'rejected'].includes(status)) {
    redirect('/admin/yapes?error=' + encodeURIComponent('No se recibió una acción válida.'));
  }
  if (!actionCode) {
    redirect('/admin/yapes?error=' + encodeURIComponent('Ingresa el código del asistente o del propietario.'));
  }

  const { data: codeData, error: codeError } = await db.rpc('verify_admin_action_code', {
    p_code: actionCode,
    p_scope: 'moderation',
  });
  const actor = Array.isArray(codeData)
    ? codeData[0] as { code_id: string; actor_label: string } | undefined
    : undefined;
  if (codeError) {
    redirect('/admin/yapes?error=' + encodeURIComponent(`No se pudo validar el código: ${codeError.message}`));
  }
  if (!actor) {
    redirect('/admin/yapes?error=' + encodeURIComponent('El código es incorrecto o está desactivado.'));
  }

  const { data, error } = await db
    .from('contribution_submissions')
    .update({
      status,
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select('id')
    .single();

  if (error || !data) {
    redirect('/admin/yapes?error=' + encodeURIComponent(`No se pudo actualizar el aporte: ${error?.message ?? 'sin respuesta'}`));
  }

  revalidatePath('/admin/yapes');
  revalidatePath('/ciclos');
  const message = status === 'approved' ? 'Comprobante aprobado.' : 'Comprobante rechazado.';
  redirect('/admin/yapes?success=' + encodeURIComponent(message));
}
