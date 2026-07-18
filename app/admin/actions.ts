'use server';
import { revalidatePath } from 'next/cache'; import { requireAdmin } from '@/lib/admin';
export async function moderateReview(form: FormData) { const { db } = await requireAdmin(); await db.from('reviews').update({ status: form.get('status'), moderation_reason: String(form.get('reason') || '') }).eq('id', String(form.get('id'))); revalidatePath('/admin/reseñas'); revalidatePath(`/profesores/${form.get('professor_id')}`); }
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
  }).eq('id', id);
  if (updateError) return { ok: false, message: `No se cerró la solicitud: ${updateError.message}` };

  revalidatePath('/admin/verificaciones');
  revalidatePath('/admin/cuentas-verificadas');
  revalidatePath('/cursos-verificados');
  return { ok: true, message: status === 'approved' ? 'Cursos y profesores aprobados correctamente.' : 'Evidencia rechazada.' };
}
export async function saveProfessor(form: FormData) { const { db } = await requireAdmin(); const id = String(form.get('id') || ''); const values = { full_name: String(form.get('full_name')), source_name: 'DIRCE UNI', is_active: true }; if (id) await db.from('professors').update(values).eq('id', id); else await db.from('professors').insert(values); revalidatePath('/admin/profesores'); }
export async function saveCourse(form: FormData) { const { db } = await requireAdmin(); const id = String(form.get('id') || ''); const values = { name: String(form.get('name')), code: String(form.get('code') || '') || null, cycle_id: Number(form.get('cycle_id')), credits: Number(form.get('credits') || 0) || null }; if (id) await db.from('courses').update(values).eq('id', id); else await db.from('courses').insert(values); revalidatePath('/admin/cursos'); }
export async function saveCycle(form: FormData) { const { db } = await requireAdmin(); const id = String(form.get('id') || ''); const values = { number: Number(form.get('number')), name: String(form.get('name')) }; if (id) await db.from('cycles').update(values).eq('id', id); else await db.from('cycles').insert(values); revalidatePath('/admin/ciclos'); }
export async function associateProfessor(form: FormData) { const { db } = await requireAdmin(); await db.from('course_professors').insert({ professor_id: String(form.get('professor_id')), course_id: String(form.get('course_id')), academic_term: String(form.get('academic_term') || '') || null, section: String(form.get('section') || '') || null }); revalidatePath('/admin/profesores'); }
