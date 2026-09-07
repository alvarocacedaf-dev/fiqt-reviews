'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/admin';
import { deleteR2Object } from '@/lib/r2';
import { createAdminClient } from '@/lib/supabase/admin';

export async function moderateWorksheetDonation(formData: FormData) {
  const donationId = String(formData.get('donation_id') ?? '');
  const status = String(formData.get('status') ?? '');
  const note = String(formData.get('note') ?? '').trim();
  if (!donationId || !['approved', 'rejected'].includes(status)) return;

  const { db } = await requireAdmin();
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
