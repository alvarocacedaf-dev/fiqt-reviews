'use server';

import { createClient } from '@/lib/supabase/server';

export async function toggleAdminWorksheetCourse(courseId: string, selected: boolean) {
  const db = await createClient();
  const {
    data: { user },
  } = await db.auth.getUser();

  if (!user) return { error: 'Debes iniciar sesión.' };
  if (!courseId) return { error: 'El curso seleccionado no es válido.' };

  const { error } = await db.rpc('set_admin_worksheet_course_unlock', {
    p_course_id: courseId,
    p_selected: selected,
  });

  return error ? { error: error.message } : { error: null };
}
