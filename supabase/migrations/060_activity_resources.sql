-- Add catalog-only resource identifiers to activity; no raw URLs or private content.
begin;
alter table public.site_activity_events add column resource_type text check(resource_type in ('course','worksheet','professor'));
alter table public.site_activity_events add column resource_id uuid;
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
  insert into public.site_activity_events(id,session_id,visitor_id,user_id,event,section,resource_type,resource_id)
  select (item->>'id')::uuid,p_session,p_visitor,p_user,item->>'event',item->>'section',item->>'resource_type',nullif(item->>'resource_id','')::uuid
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
    'resources',coalesce((select jsonb_agg(to_jsonb(r)) from (
      select e.resource_type as type,e.resource_id as id,
        coalesce(c.name,w.title,p.full_name,'Recurso no disponible') as name,
        count(*) filter(where e.event='page_view') as views,
        count(*) filter(where e.event in ('download_click','zip_click')) as downloads
      from public.site_activity_events e
      left join public.courses c on e.resource_type='course' and c.id=e.resource_id
      left join public.admin_worksheets w on e.resource_type='worksheet' and w.id=e.resource_id
      left join public.professors p on e.resource_type='professor' and p.id=e.resource_id
      where e.resource_id is not null and e.created_at>=now()-make_interval(mins=>p_minutes)
      group by e.resource_type,e.resource_id,c.name,w.title,p.full_name
      order by count(*) desc limit 15
    ) r),'[]'::jsonb),
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
