'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getWorksheetSanctionState } from '@/lib/worksheetSanctions';

async function requireWorksheetChatAccess(
  db: Awaited<ReturnType<typeof createClient>>,
) {
  const {
    data: { user },
  } = await db.auth.getUser();

  if (!user) redirect('/login?next=/mis-matches');

  const [{ data: profile }, sanctionState] = await Promise.all([
    db.from('profiles').select('role').eq('id', user.id).single(),
    getWorksheetSanctionState(db),
  ]);

  if (profile?.role !== 'admin' && sanctionState.isPermanentlyBlocked) {
    redirect('/ciclos');
  }

  return user;
}

export async function openChat(formData: FormData) {
  const threadId = String(formData.get('thread_id') ?? '');
  if (!threadId) redirect('/mis-matches?error=No se recibió el chat.');

  const db = await createClient();
  await requireWorksheetChatAccess(db);

  const { error } = await db.rpc('open_chat_thread', {
    p_thread_id: threadId,
  });

  if (error) {
    redirect(`/mis-matches?chat=${encodeURIComponent(threadId)}&error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath('/mis-matches');
  redirect(`/mis-matches?chat=${encodeURIComponent(threadId)}&success=${encodeURIComponent('El chat está activo. Ya pueden enviarse mensajes y archivos.')}`);
}

export async function finishChat(formData: FormData) {
  const threadId = String(formData.get('thread_id') ?? '');
  if (!threadId) redirect('/mis-matches?error=No se recibió el chat.');

  const db = await createClient();
  await requireWorksheetChatAccess(db);

  const { error } = await db.rpc('finish_chat_thread', {
    p_thread_id: threadId,
  });

  if (error) {
    redirect(`/mis-matches?chat=${encodeURIComponent(threadId)}&error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath('/mis-matches');
  redirect(`/mis-matches?chat=${encodeURIComponent(threadId)}&success=${encodeURIComponent('El chat fue finalizado. Su historial seguirá disponible.')}`);
}
