'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/admin';

export async function moderateWorksheetDonation(formData: FormData) {
  const donationId = String(formData.get('donation_id') ?? '');
  const status = String(formData.get('status') ?? '');
  const note = String(formData.get('note') ?? '').trim();
  if (!donationId || !['approved', 'rejected'].includes(status)) return;

  const { db } = await requireAdmin();
  const { error } = await db.rpc('moderate_worksheet_donation', {
    p_donation_id: donationId,
    p_status: status,
    p_note: note || null,
  });
  if (error) throw new Error(error.message);
  revalidatePath('/admin/donaciones-planchas');
  revalidatePath('/admin/planchas-administracion');
  revalidatePath('/planchas-administracion');
  revalidatePath('/ciclos');
}
