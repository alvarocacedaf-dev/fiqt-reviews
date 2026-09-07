'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/admin';
import { deleteR2Object } from '@/lib/r2';
import { createAdminClient } from '@/lib/supabase/admin';

export async function moderateWorksheetDonation(formData: FormData) {
  const donationId = String(formData.get('donation_id') ?? '');
  const status = String(formData.get('status') ?? '');
  const note = String(formData.get('note') ?? '').trim();
  const actionCode = String(formData.get('action_code') ?? '').trim();
  if (!donationId || !['approved', 'rejected'].includes(status)) return;

  const { db } = await requireAdmin();
  if (!actionCode) throw new Error('Ingresa el código del asistente o del propietario.');
  const { data: codeData, error: codeError } = await db.rpc('verify_admin_action_code', {
    p_code: actionCode,
    p_scope: 'moderation',
  });
  const actor = Array.isArray(codeData)
    ? codeData[0] as { code_id: string; actor_label: string } | undefined
    : undefined;
  if (codeError) throw new Error(`No se pudo validar el código: ${codeError.message}`);
  if (!actor) throw new Error('El código es incorrecto o está desactivado.');

  const { data: donation } = status === 'rejected'
    ? await db.from('worksheet_donations').select('file_path').eq('id', donationId).maybeSingle()
    : { data: null };
  if (status === 'rejected' && !donation) throw new Error('La donación no existe o ya fue eliminada.');

  const { error } = await db.rpc('moderate_worksheet_donation', {
    p_donation_id: donationId,
    p_status: status,
    p_note: note || null,
  });
  if (error) throw new Error(error.message);

  if (status === 'rejected' && donation) {
    await deleteR2Object(donation.file_path);
    const { error: deleteError } = await createAdminClient()
      .from('worksheet_donations')
      .delete()
      .eq('id', donationId)
      .eq('status', 'rejected');
    if (deleteError) throw new Error(`El archivo fue eliminado, pero no se pudo borrar su registro: ${deleteError.message}`);
  }

  revalidatePath('/admin/donaciones-planchas');
  revalidatePath('/admin/planchas-administracion');
  revalidatePath('/planchas-administracion');
  revalidatePath('/ciclos');
}
