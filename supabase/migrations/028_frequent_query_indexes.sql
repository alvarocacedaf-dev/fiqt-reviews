-- Índices para las consultas más frecuentes del catálogo, las reseñas,
-- las verificaciones y el cálculo de matches de planchas.
--
-- No se duplican los índices que PostgreSQL ya creó para estas restricciones:
--   verified_courses unique(user_id, course_id, academic_term, section)
--   verified_course_professors unique(user_id, course_id, professor_id)
--   course_professors unique(course_id, professor_id, academic_term, section)
--   worksheet_preferences primary key(user_id, course_id)

-- Página pública de profesor: reseñas aprobadas por fecha.
create index if not exists reviews_professor_status_created_idx
on public.reviews (professor_id, status, created_at desc);

-- Conteos de acceso y consultas de reseñas pertenecientes a una cuenta.
create index if not exists reviews_user_status_idx
on public.reviews (user_id, status);

-- Colas e historial de moderación ordenados cronológicamente.
create index if not exists reviews_status_created_idx
on public.reviews (status, created_at desc);

-- Solicitudes pendientes del panel administrativo.
create index if not exists verification_submissions_status_created_idx
on public.verification_submissions (status, created_at asc);

-- Historial y políticas que localizan evidencias de una cuenta.
create index if not exists verification_submissions_user_created_idx
on public.verification_submissions (user_id, created_at desc);

-- Página de profesor: cursos asociados al profesor seleccionado.
-- La restricción UNIQUE existente empieza por course_id y no sirve de forma
-- eficiente para búsquedas que comienzan por professor_id.
create index if not exists course_professors_professor_course_idx
on public.course_professors (professor_id, course_id);

-- refresh_worksheet_matches busca primero otras cuentas por curso y tipo de
-- preferencia. La PK existente comienza por user_id y no cubre este recorrido.
create index if not exists worksheet_preferences_course_preference_user_idx
on public.worksheet_preferences (course_id, preference, user_id);
