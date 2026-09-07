-- Impide registrar dos planchas con el mismo nombre lógico después de normalizarlo.
-- Se usa un bloqueo transaccional para cubrir también dos cargas simultáneas.

create or replace function public.normalized_worksheet_title(p_title text)
returns text
language sql
immutable
set search_path = public
as $$
  select regexp_replace(lower(trim(coalesce(p_title, ''))), '\s+', ' ', 'g');
$$;

create or replace function public.prevent_duplicate_admin_worksheet()
returns trigger
language plpgsql
set search_path = public, pg_catalog
as $$
declare
  v_normalized_title text := public.normalized_worksheet_title(new.title);
  v_lock_key text := new.course_id::text || '|' || new.exam_type || '|' || v_normalized_title;
begin
  perform pg_advisory_xact_lock(pg_catalog.hashtextextended(v_lock_key, 0));

  if exists (
    select 1
    from public.admin_worksheets worksheet
    where worksheet.course_id = new.course_id
      and worksheet.exam_type = new.exam_type
      and public.normalized_worksheet_title(worksheet.title) = v_normalized_title
  ) then
    raise exception 'Esta plancha ya ha sido subida.' using errcode = '23505';
  end if;

  return new;
end;
$$;

drop trigger if exists prevent_duplicate_admin_worksheet
on public.admin_worksheets;

create trigger prevent_duplicate_admin_worksheet
before insert on public.admin_worksheets
for each row execute function public.prevent_duplicate_admin_worksheet();

create or replace function public.prevent_duplicate_worksheet_donation()
returns trigger
language plpgsql
set search_path = public, pg_catalog
as $$
declare
  v_normalized_title text := public.normalized_worksheet_title(new.title);
  v_lock_key text := new.course_id::text || '|' || new.exam_type || '|' || v_normalized_title;
begin
  perform pg_advisory_xact_lock(pg_catalog.hashtextextended(v_lock_key, 0));

  if exists (
    select 1
    from public.admin_worksheets worksheet
    where worksheet.course_id = new.course_id
      and worksheet.exam_type = new.exam_type
      and public.normalized_worksheet_title(worksheet.title) = v_normalized_title
  ) or exists (
    select 1
    from public.worksheet_donations donation
    where donation.course_id = new.course_id
      and donation.exam_type = new.exam_type
      and donation.status in ('pending', 'approved')
      and public.normalized_worksheet_title(donation.title) = v_normalized_title
  ) then
    raise exception 'Esta plancha ya ha sido subida.' using errcode = '23505';
  end if;

  return new;
end;
$$;

drop trigger if exists prevent_duplicate_worksheet_donation
on public.worksheet_donations;

create trigger prevent_duplicate_worksheet_donation
before insert on public.worksheet_donations
for each row execute function public.prevent_duplicate_worksheet_donation();

comment on function public.normalized_worksheet_title(text) is
'Normaliza el título canónico utilizado para detectar planchas duplicadas.';
