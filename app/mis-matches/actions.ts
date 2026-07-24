'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export async function finishChat(formData: FormData) {
  const threadId = String(formData.get('thread_id') ?? '');
  if (!threadId) redirect('/mis-matches?error=No se recibió el chat.');

  const db = await createClient();
  const {
    data: { user },
  } = await db.auth.getUser();

  if (!user) redirect('/login?next=/mis-matches');

  const { error } = await db.rpc('finish_chat_thread', {
    p_thread_id: threadId,
  });

  if (error) {
    redirect(`/mis-matches?chat=${encodeURIComponent(threadId)}&error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath('/mis-matches');
  redirect(`/mis-matches?chat=${encodeURIComponent(threadId)}&success=${encodeURIComponent('El chat fue finalizado. Su historial seguirá disponible.')}`);
}
