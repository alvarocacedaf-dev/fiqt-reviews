'use server';

import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

type DeleteRejectedVerificationResult = {
  ok: boolean;
  message: string;
};

export async function deleteRejectedVerification(
  submissionId: string,
): Promise<DeleteRejectedVerificationResult> {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();

  if (!user) {
    return { ok: false, message: 'Tu sesión venció. Inicia sesión nuevamente.' };
  }

  if (!submissionId) {
    return { ok: false, message: 'No se recibió la verificación que deseas eliminar.' };
  }

  const adminDb = createAdminClient();
  const { data: submission, error: findError } = await adminDb
    .from('verification_submissions')
    .select('id,file_url')
    .eq('id', submissionId)
    .eq('user_id', user.id)
    .eq('status', 'rejected')
    .maybeSingle();

  if (findError) {
    return { ok: false, message: `No se pudo verificar la solicitud: ${findError.message}` };
  }

  if (!submission) {
    return { ok: false, message: 'La verificación rechazada no existe o no pertenece a tu cuenta.' };
  }

  const { data: deletedSubmission, error: deleteError } = await adminDb
    .from('verification_submissions')
    .delete()
    .eq('id', submission.id)
    .eq('user_id', user.id)
    .eq('status', 'rejected')
    .select('file_url')
    .maybeSingle();

  if (deleteError) {
    return { ok: false, message: `No se pudo eliminar la verificación: ${deleteError.message}` };
  }

  if (!deletedSubmission) {
    return { ok: false, message: 'La verificación cambió de estado y no pudo eliminarse.' };
  }

  const { error: storageError } = await adminDb.storage
    .from('verification-evidence')
    .remove([deletedSubmission.file_url]);

  if (storageError) {
    return { ok: false, message: `La verificación se eliminó, pero no se pudo borrar su evidencia: ${storageError.message}` };
  }

  revalidatePath('/cursos-verificados');
  return { ok: true, message: 'La verificación rechazada fue eliminada.' };
}
