'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

const MINIMUM_APPROVED_REVIEWS = 18;

function redirectWithMessage(type: 'error' | 'success', message: string): never {
  redirect(`/planchas?${type}=${encodeURIComponent(message)}`);
}

export async function saveWorksheetPreferences(form: FormData) {
  const db = await createClient();
  const {
    data: { user },
  } = await db.auth.getUser();

  if (!user) redirect('/login?next=/planchas');

  const { count, error: countError } = await db
    .from('reviews')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('status', 'approved');

  if (countError) redirectWithMessage('error', 'No se pudo comprobar tu cantidad de reseñas aprobadas.');
  if ((count ?? 0) < MINIMUM_APPROVED_REVIEWS) {
    redirectWithMessage('error', `Necesitas ${MINIMUM_APPROVED_REVIEWS} reseñas aprobadas para usar Planchas.`);
  }

  const haveCourseIds = [...new Set(form.getAll('have_course_ids').map(String).filter(Boolean))];
  const wantCourseIds = [...new Set(form.getAll('want_course_ids').map(String).filter(Boolean))];
  const wantSet = new Set(wantCourseIds);

  if (haveCourseIds.some(courseId => wantSet.has(courseId))) {
    redirectWithMessage('error', 'Un curso no puede aparecer en las dos columnas.');
  }

  const { error } = await db.rpc('save_worksheet_preferences', {
    p_have_course_ids: haveCourseIds,
    p_want_course_ids: wantCourseIds,
  });

  if (error) redirectWithMessage('error', `No se pudieron guardar tus selecciones: ${error.message}`);

  revalidatePath('/planchas');
  redirectWithMessage('success', 'Tus selecciones de planchas se guardaron correctamente.');
}

