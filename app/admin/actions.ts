'use server';
import { revalidatePath } from 'next/cache'; import { requireAdmin } from '@/lib/admin';
import { redirect } from 'next/navigation';

type AdminDb = Awaited<ReturnType<typeof requireAdmin>>['db'];
type CodeScope = 'moderation' | 'catalog';

async function verifyActionCode(db: AdminDb, form: FormData, scope: CodeScope) {
  const code = String(form.get('action_code') || '').trim();
  if (!code) return { ok: false as const, message: 'Ingresa el código requerido.' };

  const { data, error } = await db.rpc('verify_admin_action_code', { p_code: code, p_scope: scope });
  const actor = Array.isArray(data) ? data[0] as { code_id: string; actor_label: string } | undefined : undefined;
  if (error) return { ok: false as const, message: `No se pudo validar el código: ${error.message}` };
  if (!actor) return { ok: false as const, message: 'El código es incorrecto o está desactivado.' };
  return { ok: true as const, label: actor.actor_label };
}

function catalogRedirect(path: string, type: 'error' | 'success', message: string): never {
  redirect(`${path}?${type}=${encodeURIComponent(message)}`);
}
export type ReviewActionState = { ok: boolean; message: string };

export async function moderateReview(
  _previousState: ReviewActionState,
  form: FormData,
): Promise<ReviewActionState> {
  const { db } = await requireAdmin();
  const id = String(form.get('id') || '');
  const status = String(form.get('status') || '');
  const reason = String(form.get('reason') || '').trim();

  if (!id || !['approved', 'rejected'].includes(status)) {
    return { ok: false, message: 'No se recibió una acción válida para la reseña.' };
  }

  const actor = await verifyActionCode(db, form, 'moderation');
  if (!actor.ok) return actor;

  const { data, error } = await db
    .from('reviews')
    .update({
      status,
      moderation_reason: status === 'rejected' ? reason || 'No cumple las reglas de moderación.' : null,
      moderated_by_label: actor.label,
    })
    .eq('id', id)
    .select('id')
    .single();

  if (error || !data) {
    return { ok: false, message: `No se pudo actualizar la reseña: ${error?.message ?? 'sin respuesta de la base de datos'}` };
  }

  revalidatePath('/admin/resenas');
  revalidatePath('/admin/resenas-observadas');
  revalidatePath(`/profesores/${form.get('professor_id')}`);
  return { ok: true, message: status === 'approved' ? 'Reseña aprobada.' : 'Reseña rechazada.' };
}
export type VerificationActionState = { ok: boolean; message: string };

export async function moderateVerification(
  _previousState: VerificationActionState,
  form: FormData,
): Promise<VerificationActionState> {
  const { db, user } = await requireAdmin();
  const status = String(form.get('status') || '').trim();
  const id = String(form.get('id'));
  const selections = form.getAll('professor_course_ids').map(String).filter(Boolean);
  const pairs = selections.flatMap(value => {
    const [courseId, professorId] = value.split('|');
    return courseId && professorId ? [{ courseId, professorId }] : [];
  });
  const courseIds = [...new Set(pairs.map(pair => pair.courseId))];

  if (!['approved', 'rejected'].includes(status)) return { ok: false, message: 'No se recibió si deseas aprobar o rechazar. Intenta nuevamente.' };
  if (status === 'approved' && !pairs.length) {
    return { ok: false, message: 'Selecciona al menos un curso y profesor antes de aprobar.' };
  }


  const actor = await verifyActionCode(db, form, 'moderation');
  if (!actor.ok) return actor;

  const submission = await db.from('verification_submissions').select('user_id').eq('id', id).single();
  if (submission.error || !submission.data) {
    return { ok: false, message: `No se encontró la solicitud: ${submission.error?.message ?? 'sin datos'}` };
  }

  if (status === 'approved') {
    const academicTerm = String(form.get('academic_term') || '') || null;
    const section = String(form.get('section') || '') || null;
    const { error: coursesError } = await db.from('verified_courses').upsert(
      courseIds.map(courseId => ({
        user_id: submission.data.user_id,
        course_id: courseId,
        academic_term: academicTerm,
        section,
        verified_by: user.id,
      })),
      { onConflict: 'user_id,course_id,academic_term,section' },
    );
    if (coursesError) return { ok: false, message: `No se guardaron los cursos: ${coursesError.message}` };

    const { error: pairsError } = await db.from('verified_course_professors').upsert(
      pairs.map(pair => ({
        user_id: submission.data.user_id,
        course_id: pair.courseId,
        professor_id: pair.professorId,
        verified_by: user.id,
      })),
      { onConflict: 'user_id,course_id,professor_id' },
    );
    if (pairsError) return { ok: false, message: `No se guardaron los profesores: ${pairsError.message}` };

    const { error: historyError } = await db.from('verification_submission_approvals').upsert(
      pairs.map(pair => ({
        submission_id: id,
        course_id: pair.courseId,
        professor_id: pair.professorId,
        academic_term: academicTerm,
        section,
        approved_by: user.id,
      })),
      { onConflict: 'submission_id,course_id,professor_id' },
    );
    if (historyError) return { ok: false, message: `No se guardó el detalle de la evidencia: ${historyError.message}` };

    const { error: profileError } = await db.from('profiles').update({ verification_status: 'verified' }).eq('id', submission.data.user_id);
    if (profileError) return { ok: false, message: `No se actualizó la cuenta: ${profileError.message}` };
  } else {
    const { error: profileError } = await db.from('profiles').update({ verification_status: 'rejected' }).eq('id', submission.data.user_id);
    if (profileError) return { ok: false, message: `No se actualizó la cuenta: ${profileError.message}` };
  }

  const { error: updateError } = await db.from('verification_submissions').update({
    status,
    admin_notes: String(form.get('notes') || ''),
    reviewed_at: new Date().toISOString(),
    reviewed_by: user.id,
    reviewed_by_label: actor.label,
  }).eq('id', id);
  if (updateError) return { ok: false, message: `No se cerró la solicitud: ${updateError.message}` };

  revalidatePath('/admin/verificaciones');
  revalidatePath('/admin/cuentas-verificadas');
  revalidatePath('/cursos-verificados');
  return { ok: true, message: status === 'approved' ? 'Cursos y profesores aprobados correctamente.' : 'Evidencia rechazada.' };
}
export async function saveProfessor(form: FormData) {
  const { db } = await requireAdmin();
  const actor = await verifyActionCode(db, form, 'catalog');
  if (!actor.ok) catalogRedirect('/admin/profesores', 'error', actor.message);
  const id = String(form.get('id') || '');
  const values = { full_name: String(form.get('full_name')), source_name: 'DIRCE UNI', is_active: true };
  const result = id ? await db.from('professors').update(values).eq('id', id) : await db.from('professors').insert(values);
  if (result.error) catalogRedirect('/admin/profesores', 'error', result.error.message);
  revalidatePath('/admin/profesores');
  catalogRedirect('/admin/profesores', 'success', `Cambio guardado por ${actor.label}.`);
}

export async function saveCourse(form: FormData) {
  const { db } = await requireAdmin();
  const actor = await verifyActionCode(db, form, 'catalog');
  if (!actor.ok) catalogRedirect('/admin/cursos', 'error', actor.message);
  const id = String(form.get('id') || '');
  const values = { name: String(form.get('name')), code: String(form.get('code') || '') || null, cycle_id: Number(form.get('cycle_id')), credits: Number(form.get('credits') || 0) || null };
  const result = id ? await db.from('courses').update(values).eq('id', id) : await db.from('courses').insert(values);
  if (result.error) catalogRedirect('/admin/cursos', 'error', result.error.message);
  revalidatePath('/admin/cursos');
  catalogRedirect('/admin/cursos', 'success', `Cambio guardado por ${actor.label}.`);
}

export async function saveCycle(form: FormData) {
  const { db } = await requireAdmin();
  const actor = await verifyActionCode(db, form, 'catalog');
  if (!actor.ok) catalogRedirect('/admin/ciclos', 'error', actor.message);
  const id = String(form.get('id') || '');
  const values = { number: Number(form.get('number')), name: String(form.get('name')) };
  const result = id ? await db.from('cycles').update(values).eq('id', id) : await db.from('cycles').insert(values);
  if (result.error) catalogRedirect('/admin/ciclos', 'error', result.error.message);
  revalidatePath('/admin/ciclos');
  catalogRedirect('/admin/ciclos', 'success', `Cambio guardado por ${actor.label}.`);
}

export async function associateProfessor(form: FormData) {
  const { db } = await requireAdmin();
  const actor = await verifyActionCode(db, form, 'catalog');
  if (!actor.ok) catalogRedirect('/admin/profesores', 'error', actor.message);
  const { error } = await db.from('course_professors').insert({ professor_id: String(form.get('professor_id')), course_id: String(form.get('course_id')), academic_term: String(form.get('academic_term') || '') || null, section: String(form.get('section') || '') || null });
  if (error) catalogRedirect('/admin/profesores', 'error', error.message);
  revalidatePath('/admin/profesores');
  catalogRedirect('/admin/profesores', 'success', `Asociación guardada por ${actor.label}.`);
}

export async function removeVerifiedCourseAccess(form: FormData) {
  const { db } = await requireAdmin();
  const actor = await verifyActionCode(db, form, 'catalog');
  if (!actor.ok) catalogRedirect('/admin/cursos-cuentas', 'error', actor.message);

  const userId = String(form.get('user_id') || '');
  const courseId = String(form.get('course_id') || '');
  if (!userId || !courseId) catalogRedirect('/admin/cursos-cuentas', 'error', 'No se recibió la cuenta o el curso.');

  const { error: professorsError } = await db
    .from('verified_course_professors')
    .delete()
    .eq('user_id', userId)
    .eq('course_id', courseId);
  if (professorsError) catalogRedirect('/admin/cursos-cuentas', 'error', `No se quitaron los profesores: ${professorsError.message}`);

  const { error: coursesError } = await db
    .from('verified_courses')
    .delete()
    .eq('user_id', userId)
    .eq('course_id', courseId);
  if (coursesError) catalogRedirect('/admin/cursos-cuentas', 'error', `No se quitó el curso: ${coursesError.message}`);

  const { count, error: countError } = await db
    .from('verified_course_professors')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);
  if (!countError && count === 0) {
    await db.from('profiles').update({ verification_status: 'unverified' }).eq('id', userId);
  }

  revalidatePath('/admin/cursos-cuentas');
  revalidatePath('/cursos-verificados');
  revalidatePath('/ciclos');
  catalogRedirect('/admin/cursos-cuentas', 'success', `Acceso al curso retirado por ${actor.label}.`);
}
