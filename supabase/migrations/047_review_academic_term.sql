alter table public.reviews
  add column if not exists academic_term text;

alter table public.reviews
  drop constraint if exists reviews_academic_term_check;

alter table public.reviews
  add constraint reviews_academic_term_check
  check (
    academic_term is null
    or academic_term ~ '^(2018|2019|2020|2021|2022|2023|2024|2025)-(1|2|3)$'
    or academic_term = '2026-1'
  );

create or replace function public.enforce_review_academic_term()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.academic_term is null or not (
    new.academic_term ~ '^(2018|2019|2020|2021|2022|2023|2024|2025)-(1|2|3)$'
    or new.academic_term = '2026-1'
  ) then
    raise exception 'Selecciona un ciclo académico válido para la reseña.';
  end if;

  return new;
end;
$$;

drop trigger if exists reviews_academic_term_before_insert on public.reviews;
create trigger reviews_academic_term_before_insert
before insert on public.reviews
for each row execute function public.enforce_review_academic_term();
