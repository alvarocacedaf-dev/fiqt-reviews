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
  const { db } = await requireAdmin();
  const status = String(form.get('status') || '').trim();
  const id = String(form.get('id'));
  const selections = form.getAll('professor_course_ids').map(String).filter(Boolean);
  const pairs = selections.flatMap(value => {
    const [courseId, professorId] = value.split('|');
    return courseId && professorId ? [{ courseId, professorId }] : [];
  });

  if (!['approved', 'rejected'].includes(status)) return { ok: false, message: 'No se recibió si deseas aprobar o rechazar. Intenta nuevamente.' };
  if (status === 'approved' && !pairs.length) {
    return { ok: false, message: 'Selecciona al menos un curso y profesor antes de aprobar.' };
  }

  const { data, error } = await db.rpc('moderate_verification_submission', {
    p_submission_id: id,
    p_status: status,
    p_pairs: pairs.map(pair => ({
      course_id: pair.courseId,
      professor_id: pair.professorId,
    })),
    p_academic_term: String(form.get('academic_term') || '') || null,
    p_section: String(form.get('section') || '') || null,
    p_notes: String(form.get('notes') || ''),
    p_action_code: String(form.get('action_code') || ''),
  });
  const result = Array.isArray(data)
    ? data[0] as { ok: boolean; message: string } | undefined
    : undefined;

  if (error) {
    return { ok: false, message: `No se pudo completar la verificación: ${error.message}` };
  }
  if (!result) {
    return { ok: false, message: 'La base de datos no devolvió el resultado de la verificación.' };
  }
  if (!result.ok) return result;

  revalidatePath('/admin/verificaciones');
  revalidatePath('/admin/cuentas-verificadas');
  revalidatePath('/cursos-verificados');
  return result;
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
