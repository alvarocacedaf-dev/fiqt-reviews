-- Private extraction queue and review. Existing banks remain immutable seeds.
begin;
create table public.exam_bank_jobs (
  id uuid primary key default gen_random_uuid(),
  worksheet_id uuid references public.admin_worksheets(id) on delete set null,
  bank_key text not null check (bank_key in ('bfi01-pc1','bfi01-pc2','qu328-final')),
  status text not null default 'queued' check (status in ('queued','processing','review','waiting_pdf','failed','done')),
  pages jsonb not null default '[]',
  page_count integer,
  source_hash text,
  warning text,
  error text,
  attempts integer not null default 0,
  lease_token uuid,
  lease_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (worksheet_id, bank_key)
);
create table public.exam_bank_questions (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.exam_bank_jobs(id) on delete cascade,
  bank_key text not null,
  ordinal integer not null,
  regions jsonb not null,
  extracted_text text not null default '',
  status text not null default 'draft' check (status in ('draft','approved','discarded')),
  question jsonb,
  content_hash text,
  version integer not null default 1,
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  unique(job_id, ordinal),
  check (status <> 'approved' or (question is not null and content_hash is not null))
);
create unique index exam_bank_unique_approved_image on public.exam_bank_questions(bank_key, content_hash) where status='approved';
create index exam_bank_jobs_queue on public.exam_bank_jobs(status, created_at);
create index exam_bank_questions_bank on public.exam_bank_questions(bank_key, status);
alter table public.exam_bank_jobs enable row level security;
alter table public.exam_bank_questions enable row level security;
revoke all on public.exam_bank_jobs, public.exam_bank_questions from anon, authenticated;
grant all on public.exam_bank_jobs, public.exam_bank_questions to service_role;

-- Existing bucket policies allow collaborators to read/delete administration
-- files. Draft pages and generator assets must instead go through our APIs.
create policy "question bank assets via server only" on storage.objects
as restrictive for all to authenticated
using (bucket_id<>'admin-worksheets' or name not like 'question-bank/%')
with check (bucket_id<>'admin-worksheets' or name not like 'question-bank/%');

create function public.enqueue_exam_bank_upload() returns trigger
language plpgsql security definer set search_path=public as $$
declare k text; n text;
begin
  if new.course_id='d0d588a3-9e52-4531-8e9a-75442c6f503e' and new.exam_type='final' then k:='qu328-final';
  elsif new.course_id='5d448bf9-7246-4153-890e-c57283f0a254' and new.exam_type='practice' then
    n := substring(lower(new.title) from 'calificada\s+([12])\y');
    if n is not null then k:='bfi01-pc'||n; end if;
  end if;
  if k is not null then
    insert into public.exam_bank_jobs(worksheet_id,bank_key) values(new.id,k) on conflict do nothing;
    if tg_op='UPDATE' and new.preview_file_path is distinct from old.preview_file_path then
      update public.exam_bank_jobs set status='queued',error=null,updated_at=now()
        where worksheet_id=new.id and status='waiting_pdf';
    end if;
  end if;
  return new;
end $$;
create trigger queue_new_exam_bank_upload after insert or update of preview_file_path on public.admin_worksheets
  for each row execute function public.enqueue_exam_bank_upload();
revoke all on function public.enqueue_exam_bank_upload() from public, anon, authenticated;

create function public.claim_exam_bank_job(p_id uuid default null)
returns setof public.exam_bank_jobs language plpgsql security definer set search_path=public as $$
declare chosen uuid;
begin
  select id into chosen from public.exam_bank_jobs
   where (p_id is null or id=p_id) and (status='queued' or (status='processing' and lease_until<now()))
   order by created_at for update skip locked limit 1;
  if chosen is null then return; end if;
  return query update public.exam_bank_jobs set status='processing',lease_token=gen_random_uuid(),
    lease_until=now()+interval '6 minutes',attempts=attempts+1,updated_at=now(),error=null
    where id=chosen returning *;
end $$;
revoke all on function public.claim_exam_bank_job(uuid) from public, anon, authenticated;
grant execute on function public.claim_exam_bank_job(uuid) to service_role;

create function public.review_exam_bank_job(p_id uuid,p_action text) returns void
language plpgsql security definer set search_path=public as $$
declare j public.exam_bank_jobs; next_ordinal integer;
begin
 select * into j from public.exam_bank_jobs where id=p_id for update;
 if not found or j.status<>'review' then raise exception 'El examen no está listo para revisar.'; end if;
 if p_action='finish' then
   if exists(select 1 from public.exam_bank_questions where job_id=p_id and status='draft') then
     raise exception 'Aprueba o descarta todos los borradores primero.';
   end if;
   update public.exam_bank_jobs set status='done',updated_at=now() where id=p_id;
 elsif p_action='add' then
   select coalesce(max(ordinal),0)+1 into next_ordinal from public.exam_bank_questions where job_id=p_id;
   insert into public.exam_bank_questions(job_id,bank_key,ordinal,regions)
   values(p_id,j.bank_key,next_ordinal,'[{"page":1,"left":0,"top":0,"width":1,"height":1}]');
 else raise exception 'Acción inválida.'; end if;
end $$;
revoke all on function public.review_exam_bank_job(uuid,text) from public,anon,authenticated;
grant execute on function public.review_exam_bank_job(uuid,text) to service_role;

-- Immutable pools let the next migration recognize combinations generated by 065.
create table public.exam_bank_pools (
  bank_key text not null,
  fingerprint text not null,
  keys text[] not null,
  created_at timestamptz not null default now(),
  primary key(bank_key,fingerprint)
);
alter table public.exam_bank_pools enable row level security;
revoke all on public.exam_bank_pools from anon,authenticated;
grant all on public.exam_bank_pools to service_role;
commit;
