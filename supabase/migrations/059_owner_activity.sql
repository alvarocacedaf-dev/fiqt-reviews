-- Private activity dashboard. Only the owner can read; only the server can ingest.
begin;
create table public.site_activity_sessions (
  id text primary key,
  visitor_id uuid not null,
  user_id uuid references auth.users(id) on delete cascade,
  section text not null,
  active boolean not null default true,
  last_seen timestamptz not null default now()
);
create index site_activity_sessions_seen on public.site_activity_sessions(last_seen);
create table public.site_activity_events (
  id uuid primary key,
  session_id text,
  visitor_id uuid not null,
  user_id uuid references auth.users(id) on delete cascade,
  event text not null check(event in ('page_view','download_click','zip_click','review_submitted','verification_submitted','contribution_submitted')),
  section text not null,
  created_at timestamptz not null default now()
);
create index site_activity_events_time on public.site_activity_events(created_at);
create table public.site_activity_maintenance (id boolean primary key default true check(id), cleaned_at timestamptz not null default now());
insert into public.site_activity_maintenance(id) values (true);
alter table public.site_activity_sessions enable row level security;
alter table public.site_activity_events enable row level security;
alter table public.site_activity_maintenance enable row level security;
revoke all on public.site_activity_sessions, public.site_activity_events, public.site_activity_maintenance from anon, authenticated;
grant select on public.site_activity_sessions, public.site_activity_events to authenticated;
create policy "owner reads site sessions" on public.site_activity_sessions for select to authenticated using(public.is_owner());
create policy "owner reads site events" on public.site_activity_events for select to authenticated using(public.is_owner());
grant all on public.site_activity_sessions, public.site_activity_events, public.site_activity_maintenance to service_role;

-- Delegated admins must not be able to promote themselves through the profiles API.
create or replace function public.protect_owner_role()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.role is distinct from old.role and auth.uid() is not null and not public.is_owner() then
    raise exception 'Solo el propietario puede cambiar roles.' using errcode = '42501';
  end if;
  return new;
end $$;
create trigger protect_owner_role before update of role on public.profiles
for each row execute function public.protect_owner_role();

create or replace function public.record_site_activity(
 p_session text, p_visitor uuid, p_user uuid, p_section text, p_active boolean, p_events jsonb
) returns boolean language plpgsql security definer set search_path = public as $$
declare v_last timestamptz;
begin
  if length(p_session) <> 64 or length(p_section) > 80 or jsonb_typeof(p_events) <> 'array' or jsonb_array_length(p_events) > 20 then
    raise exception 'Invalid activity';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(p_session, 0));
  select last_seen into v_last from public.site_activity_sessions where id = p_session;
  if v_last > now() - interval '10 seconds' then return false; end if;
  insert into public.site_activity_sessions(id,visitor_id,user_id,section,active)
  values(p_session,p_visitor,p_user,p_section,p_active)
  on conflict(id) do update set user_id=excluded.user_id, section=excluded.section, active=excluded.active, last_seen=now();
  insert into public.site_activity_events(id,session_id,visitor_id,user_id,event,section)
  select (item->>'id')::uuid,p_session,p_visitor,p_user,item->>'event',item->>'section'
  from jsonb_array_elements(p_events) item
  where item->>'event' in ('page_view','download_click','zip_click') and length(item->>'section') <= 80
  on conflict(id) do nothing;
  -- A single caller per hour performs bounded-retention cleanup.
  update public.site_activity_maintenance set cleaned_at=now() where id and cleaned_at < now()-interval '1 hour';
  if found then
    delete from public.site_activity_events where created_at < now()-interval '30 days';
    delete from public.site_activity_sessions where last_seen < now()-interval '2 days';
  end if;
  return true;
end $$;
revoke all on function public.record_site_activity(text,uuid,uuid,text,boolean,jsonb) from public, anon, authenticated;
grant execute on function public.record_site_activity(text,uuid,uuid,text,boolean,jsonb) to service_role;

-- Submission events are emitted only after a real insert, never on a button click.
create or replace function public.record_submission_activity()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.site_activity_events(id,visitor_id,user_id,event,section)
  values(gen_random_uuid(),new.user_id,new.user_id,TG_ARGV[0],TG_ARGV[1]);
  return new;
end $$;
revoke all on function public.record_submission_activity() from public, anon, authenticated;
create trigger activity_review after insert on public.reviews for each row execute function public.record_submission_activity('review_submitted','Profesores y reseñas');
create trigger activity_verification after insert on public.verification_submissions for each row execute function public.record_submission_activity('verification_submitted','Verificación');
create trigger activity_contribution after insert on public.contribution_submissions for each row execute function public.record_submission_activity('contribution_submitted','Ruta de recompensas');

create or replace function public.owner_activity_snapshot(p_days integer default 7, p_minutes integer default 30)
returns jsonb language plpgsql security definer set search_path = public as $$
declare result jsonb;
begin
  if not coalesce(public.is_owner(),false) then raise exception 'Solo el propietario.' using errcode='42501'; end if;
  if p_days not in (1,7,30) or p_minutes not in (5,30) then raise exception 'Invalid period'; end if;
  select jsonb_build_object(
    'generated_at',now(),
    'totals',(select jsonb_build_object(
      'views',count(*) filter(where event='page_view'),
      'visitors',count(distinct coalesce(user_id::text,visitor_id::text)) filter(where event='page_view'),
      'accounts',count(distinct user_id) filter(where event='page_view'),
      'downloads',count(*) filter(where event in ('download_click','zip_click'))
    ) from public.site_activity_events where created_at >= now()-make_interval(days=>p_days)),
    'online',coalesce((select jsonb_agg(to_jsonb(o) order by o.active desc,o.last_seen desc) from (
      select distinct on(coalesce(s.user_id::text,s.visitor_id::text))
        coalesce(s.user_id::text,s.visitor_id::text) as key,
        coalesce(nullif(p.full_name,''),case when s.user_id is null then 'Visitante anónimo' else 'Usuario registrado' end) as name,
        s.user_id is not null as registered,s.section,s.active,s.last_seen
      from public.site_activity_sessions s left join public.profiles p on p.id=s.user_id
      where s.last_seen > now()-interval '75 seconds'
      order by coalesce(s.user_id::text,s.visitor_id::text),s.active desc,s.last_seen desc
    ) o),'[]'::jsonb),
    'popular',coalesce((select jsonb_agg(to_jsonb(q)) from (
      select section,count(*) as views,count(distinct coalesce(user_id::text,visitor_id::text)) as visitors
      from public.site_activity_events where event='page_view' and created_at >= now()-make_interval(mins=>p_minutes)
      group by section order by views desc limit 12
    ) q),'[]'::jsonb),
    'daily',coalesce((select jsonb_agg(to_jsonb(d) order by d.day) from (
      select (created_at at time zone 'America/Lima')::date as day,count(*) as views,
        count(distinct coalesce(user_id::text,visitor_id::text)) as visitors
      from public.site_activity_events where event='page_view' and created_at>=now()-make_interval(days=>p_days)
      group by 1
    ) d),'[]'::jsonb),
    'recent',coalesce((select jsonb_agg(to_jsonb(r) order by r.created_at desc) from (
      select e.id,coalesce(nullif(p.full_name,''),case when e.user_id is null then 'Visitante anónimo' else 'Usuario registrado' end) as name,e.event,e.section,e.created_at
      from public.site_activity_events e left join public.profiles p on p.id=e.user_id
      where e.created_at>=now()-make_interval(mins=>p_minutes)
      order by e.created_at desc limit 40
    ) r),'[]'::jsonb)
  ) into result;
  return result;
end $$;
revoke all on function public.owner_activity_snapshot(integer,integer) from public, anon;
grant execute on function public.owner_activity_snapshot(integer,integer) to authenticated;
commit;
