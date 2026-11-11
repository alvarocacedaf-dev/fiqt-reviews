-- Compact per-user history: a permutation visits each combination exactly once.
create table if not exists public.practice_exam_sequences (
  user_id uuid not null references auth.users(id) on delete cascade,
  bank_key text not null,
  question_count integer not null check (question_count between 1 and 10),
  total bigint not null check (total > 0),
  cursor bigint not null default 0,
  permutation_offset bigint not null,
  permutation_step bigint not null,
  rounds integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, bank_key, question_count)
);
alter table public.practice_exam_sequences enable row level security;
revoke all on public.practice_exam_sequences from anon, authenticated;

create or replace function public.reserve_practice_exam_combination(
  p_user_id uuid, p_bank_key text, p_count integer, p_total bigint,
  p_offset bigint, p_step bigint
) returns table(combination_rank bigint, restarted boolean)
language plpgsql security definer set search_path = public as $$
declare
  s public.practice_exam_sequences%rowtype;
  a bigint; b bigint; remainder bigint;
  did_restart boolean := false;
begin
  if p_user_id is null or p_bank_key is null or length(p_bank_key) > 150
    or p_count is null or p_count not between 1 and 10
    or p_total is null or p_total < 1 or p_total >= 2147483648
    or p_offset is null or p_offset < 0 or p_offset >= p_total
    or p_step is null or p_step < 1 or p_step > p_total then
    raise exception 'Invalid combination parameters';
  end if;
  a := p_step; b := p_total;
  while b <> 0 loop remainder := a % b; a := b; b := remainder; end loop;
  if a <> 1 then raise exception 'Step must be coprime'; end if;
  insert into public.practice_exam_sequences(user_id, bank_key, question_count, total, permutation_offset, permutation_step)
    values(p_user_id, p_bank_key, p_count, p_total, p_offset, p_step)
    on conflict do nothing;
  select * into s from public.practice_exam_sequences
    where user_id = p_user_id and bank_key = p_bank_key and question_count = p_count for update;
  if s.total <> p_total then raise exception 'Bank version mismatch'; end if;
  if s.cursor >= s.total then
    did_restart := true;
    -- Avoid immediately repeating the last exam across two rounds when possible.
    if s.total > 1 and p_offset = (s.permutation_offset + (s.total - 1) * s.permutation_step) % s.total then
      p_offset := (p_offset + 1) % s.total;
    end if;
    s.cursor := 0; s.permutation_offset := p_offset; s.permutation_step := p_step; s.rounds := s.rounds + 1;
  end if;
  combination_rank := (s.permutation_offset + s.cursor * s.permutation_step) % s.total;
  restarted := did_restart;
  update public.practice_exam_sequences set cursor = s.cursor + 1,
    permutation_offset = s.permutation_offset, permutation_step = s.permutation_step,
    rounds = s.rounds, updated_at = now()
    where user_id = p_user_id and bank_key = p_bank_key and question_count = p_count;
  return next;
end;
$$;
revoke all on function public.reserve_practice_exam_combination(uuid,text,integer,bigint,bigint,bigint) from public, anon, authenticated;
grant execute on function public.reserve_practice_exam_combination(uuid,text,integer,bigint,bigint,bigint) to service_role;
