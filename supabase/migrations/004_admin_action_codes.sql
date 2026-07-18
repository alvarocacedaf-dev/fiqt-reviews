-- Códigos separados para moderación y mantenimiento del catálogo.
-- Los secretos nunca se guardan en texto plano: solo se conserva su hash.
create table if not exists public.admin_action_codes (
  id uuid primary key default gen_random_uuid(),
  label text not null unique,
  scope text not null check (scope in ('moderation', 'catalog')),
  code_hash text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.admin_action_codes enable row level security;

create index if not exists admin_action_codes_active_scope_idx
on public.admin_action_codes (scope, is_active);

alter table public.reviews
  add column if not exists moderated_by_label text;

alter table public.verification_submissions
  add column if not exists reviewed_by_label text;

create or replace function public.verify_admin_action_code(p_code text, p_scope text)
returns table(code_id uuid, actor_label text)
language sql
stable
security definer
set search_path = public, extensions
as $$
  select codes.id, codes.label
  from public.admin_action_codes codes
  where public.is_admin()
    and codes.is_active
    and codes.scope = p_scope
    and codes.code_hash = crypt(p_code, codes.code_hash)
  limit 1
$$;

revoke all on function public.verify_admin_action_code(text, text) from public;
grant execute on function public.verify_admin_action_code(text, text) to authenticated;

-- Los códigos se crean desde SQL Editor después de aplicar la migración:
-- insert into public.admin_action_codes(label, scope, code_hash)
-- values ('Asistente 1', 'moderation', crypt('CODIGO_SECRETO', gen_salt('bf')));
