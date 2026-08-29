'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/admin';

export async function moderateContribution(form: FormData) {
  const { db, user } = await requireAdmin();
  const id = String(form.get('id') || '');
  const status = String(form.get('status') || '');

  if (!id || !['approved', 'rejected'].includes(status)) {
    redirect('/admin/yapes?error=' + encodeURIComponent('No se recibió una acción válida.'));
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
