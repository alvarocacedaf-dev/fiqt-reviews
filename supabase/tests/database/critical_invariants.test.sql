begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(28);

-- Índices que sostienen las consultas principales.
select ok(to_regclass('public.reviews_professor_status_created_idx') is not null,
  'reviews tiene índice para profesor, estado y fecha');
select ok(to_regclass('public.reviews_user_status_idx') is not null,
  'reviews tiene índice para cuenta y estado');
select ok(to_regclass('public.reviews_status_created_idx') is not null,
  'reviews tiene índice para la cola de moderación');
select ok(to_regclass('public.verification_submissions_status_created_idx') is not null,
  'verification_submissions tiene índice para pendientes');
select ok(to_regclass('public.verification_submissions_user_created_idx') is not null,
  'verification_submissions tiene índice para historial por cuenta');
select ok(to_regclass('public.course_professors_professor_course_idx') is not null,
  'course_professors permite buscar eficientemente por profesor');
select ok(to_regclass('public.worksheet_preferences_course_preference_user_idx') is not null,
  'worksheet_preferences soporta el cálculo de matches');

-- RLS debe permanecer habilitado en tablas sensibles.
select is((select relrowsecurity from pg_class where oid = 'public.profiles'::regclass), true,
  'profiles tiene RLS habilitado');
select is((select relrowsecurity from pg_class where oid = 'public.reviews'::regclass), true,
  'reviews tiene RLS habilitado');
select is((select relrowsecurity from pg_class where oid = 'public.verification_submissions'::regclass), true,
  'verification_submissions tiene RLS habilitado');
select is((select relrowsecurity from pg_class where oid = 'public.admin_action_codes'::regclass), true,
  'admin_action_codes tiene RLS habilitado');

select ok(exists (
  select 1 from pg_trigger
  where tgrelid = 'public.reviews'::regclass
    and tgname = 'reviews_before_insert'
    and not tgisinternal
), 'reviews conserva su trigger de reglas de inserción');

-- La moderación de verificaciones debe seguir siendo una única RPC protegida.
select ok(to_regprocedure(
  'public.moderate_verification_submission(uuid,text,jsonb,text,text,text,text)'
) is not null, 'existe la RPC transaccional de verificaciones');
select ok(has_function_privilege(
  'authenticated',
  'public.moderate_verification_submission(uuid,text,jsonb,text,text,text,text)',
  'EXECUTE'
), 'authenticated puede llamar la RPC, que valida internamente el rol admin');
select ok(not has_function_privilege(
  'anon',
  'public.moderate_verification_submission(uuid,text,jsonb,text,text,text,text)',
  'EXECUTE'
), 'anon no puede ejecutar la moderación');
select like(lower(pg_get_functiondef(
  'public.moderate_verification_submission(uuid,text,jsonb,text,text,text,text)'::regprocedure
)), '%for update%', 'la RPC bloquea la solicitud para evitar doble moderación');

-- Reglas de acceso a planchas y funciones de matches/chats.
select ok(to_regprocedure('public.has_worksheet_access(uuid)') is not null,
  'existe la regla de acceso a planchas');
select like(pg_get_functiondef('public.has_worksheet_access(uuid)'::regprocedure), '%>= 16%',
  'el acceso a planchas continúa exigiendo 16 reseñas aprobadas');
select ok(to_regprocedure('public.refresh_worksheet_matches(uuid)') is not null,
  'existe el recálculo de matches');
select ok(to_regprocedure('public.open_chat_thread(uuid)') is not null,
  'existe la apertura controlada de chats');
select ok(to_regprocedure('public.finish_chat_thread(uuid)') is not null,
  'existe el cierre controlado de chats');
select ok(to_regprocedure('public.send_chat_message(uuid,text,text,text,text,bigint)') is not null,
  'existe el envío controlado de mensajes');
select ok(to_regprocedure('public.create_chat_report(uuid,uuid,text,jsonb)') is not null,
  'existe la creación controlada de reportes');
select ok(to_regprocedure('public.submit_chat_exchange(uuid,jsonb)') is not null,
  'existe la entrega protegida del intercambio');
select ok(to_regprocedure('public.get_my_worksheet_sanctions()') is not null,
  'existe el cálculo de sanciones');

-- Restricciones y políticas que no deben desaparecer durante refactorizaciones.
select ok(exists (
  select 1 from pg_constraint
  where conrelid = 'public.reviews'::regclass
    and contype = 'u'
    and pg_get_constraintdef(oid) like 'UNIQUE (user_id, professor_id, course_id)%'
), 'una cuenta solo puede reseñar una vez cada profesor y curso');
select ok(exists (
  select 1 from pg_constraint
  where conrelid = 'public.verified_course_professors'::regclass
    and contype = 'u'
    and pg_get_constraintdef(oid) like 'UNIQUE (user_id, course_id, professor_id)%'
), 'la autorización profesor-curso no puede duplicarse');
select ok(exists (
  select 1 from pg_policies
  where schemaname = 'public'
    and tablename = 'reviews'
    and policyname = 'reviews own insert'
), 'reviews conserva la política de inserción propia');

select * from finish();
rollback;
