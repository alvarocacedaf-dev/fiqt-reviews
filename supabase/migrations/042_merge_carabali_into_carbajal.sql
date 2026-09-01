-- Corrige el profesor transcrito erróneamente como "Carabali" y conserva
-- todas sus relaciones, verificaciones y reseñas bajo el registro correcto.

begin;

do $$
declare
  v_wrong_professor uuid;
  v_correct_professor uuid;
begin
  select id into v_wrong_professor
  from public.professors
  where full_name = 'Carabali Gutiérrez, Félix'
  order by created_at
  limit 1;

  select id into v_correct_professor
  from public.professors
  where full_name = 'Carbajal Gutiérrez, Félix'
  order by created_at
  limit 1;

  if v_wrong_professor is null then
    return;
  end if;

  if v_correct_professor is null then
    update public.professors
    set full_name = 'Carbajal Gutiérrez, Félix'
    where id = v_wrong_professor;
    return;
  end if;

  -- Evita perder información silenciosamente si una misma cuenta hubiera
  -- reseñado ambos registros duplicados para el mismo curso.
  if exists (
    select 1
    from public.reviews wrong_review
    join public.reviews correct_review
      on correct_review.user_id = wrong_review.user_id
     and correct_review.course_id = wrong_review.course_id
     and correct_review.professor_id = v_correct_professor
    where wrong_review.professor_id = v_wrong_professor
      and wrong_review.user_id is not null
  ) then
    raise exception 'Hay reseñas duplicadas de una misma cuenta que requieren revisión manual antes de fusionar los profesores.';
  end if;

  update public.reviews
  set professor_id = v_correct_professor
  where professor_id = v_wrong_professor;

  delete from public.course_professors wrong_link
  where wrong_link.professor_id = v_wrong_professor
    and exists (
      select 1
      from public.course_professors correct_link
      where correct_link.professor_id = v_correct_professor
        and correct_link.course_id = wrong_link.course_id
        and correct_link.academic_term is not distinct from wrong_link.academic_term
        and correct_link.section is not distinct from wrong_link.section
    );

  update public.course_professors
  set professor_id = v_correct_professor
  where professor_id = v_wrong_professor;

  delete from public.verified_course_professors wrong_verification
  where wrong_verification.professor_id = v_wrong_professor
    and exists (
      select 1
      from public.verified_course_professors correct_verification
      where correct_verification.professor_id = v_correct_professor
        and correct_verification.user_id = wrong_verification.user_id
        and correct_verification.course_id = wrong_verification.course_id
    );

  update public.verified_course_professors
  set professor_id = v_correct_professor
  where professor_id = v_wrong_professor;

  delete from public.verification_submission_approvals wrong_approval
  where wrong_approval.professor_id = v_wrong_professor
    and exists (
      select 1
      from public.verification_submission_approvals correct_approval
      where correct_approval.professor_id = v_correct_professor
        and correct_approval.submission_id = wrong_approval.submission_id
        and correct_approval.course_id = wrong_approval.course_id
    );

  update public.verification_submission_approvals
  set professor_id = v_correct_professor
  where professor_id = v_wrong_professor;

  delete from public.professors
  where id = v_wrong_professor;
end
$$;

commit;
