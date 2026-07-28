-- Amplía las reseñas a seis preguntas con escala del 1 al 10.
-- Es seguro volver a ejecutar este archivo: las reseñas antiguas solo se
-- convierten de 1-5 a 1-10 la primera vez que se crea la nueva columna.

begin;

do $$
begin
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'reviews'
      and column_name = 'course_demand_rating'
  ) then
    alter table public.reviews
      drop constraint if exists reviews_clarity_rating_check,
      drop constraint if exists reviews_difficulty_rating_check,
      drop constraint if exists reviews_fairness_rating_check,
      drop constraint if exists reviews_treatment_rating_check,
      drop constraint if exists reviews_workload_rating_check;

    -- Conserva la proporción de las respuestas históricas: 1-5 pasa a 2-10.
    update public.reviews
    set
      clarity_rating = clarity_rating * 2,
      difficulty_rating = difficulty_rating * 2,
      fairness_rating = fairness_rating * 2,
      treatment_rating = treatment_rating * 2,
      workload_rating = workload_rating * 2;

    alter table public.reviews
      add column course_demand_rating integer not null default 5;

    update public.reviews
    set course_demand_rating = workload_rating;
  end if;
end
$$;

alter table public.reviews
  drop constraint if exists reviews_clarity_rating_check,
  drop constraint if exists reviews_difficulty_rating_check,
  drop constraint if exists reviews_fairness_rating_check,
  drop constraint if exists reviews_treatment_rating_check,
  drop constraint if exists reviews_workload_rating_check,
  drop constraint if exists reviews_course_demand_rating_check;

alter table public.reviews
  add constraint reviews_clarity_rating_check check (clarity_rating between 1 and 10),
  add constraint reviews_difficulty_rating_check check (difficulty_rating between 1 and 10),
  add constraint reviews_fairness_rating_check check (fairness_rating between 1 and 10),
  add constraint reviews_treatment_rating_check check (treatment_rating between 1 and 10),
  add constraint reviews_workload_rating_check check (workload_rating between 1 and 10),
  add constraint reviews_course_demand_rating_check check (course_demand_rating between 1 and 10);

commit;
