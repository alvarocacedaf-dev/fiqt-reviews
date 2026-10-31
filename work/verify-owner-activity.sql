-- Rollback-only integration check. Does not persist telemetry or change account roles.
begin;
select set_config('test.activity_owner', (select id::text from public.profiles where role='owner' limit 1), true);
select set_config('test.activity_admin', (select id::text from public.profiles where role='admin' limit 1), true);
select set_config('test.activity_event', gen_random_uuid()::text, true);
select set_config('test.activity_course', (select id::text from public.courses limit 1), true);
do $$ begin
  assert nullif(current_setting('test.activity_owner'),'') is not null, 'An owner account is required';
  assert nullif(current_setting('test.activity_admin'),'') is not null, 'A delegated admin is required';
end $$;
select public.record_site_activity(repeat('a',64),gen_random_uuid(),null,'Ciclos',true,
 jsonb_build_array(jsonb_build_object('id',current_setting('test.activity_event'),'event','page_view','section','Ciclos','resource_type','course','resource_id',current_setting('test.activity_course'))));
do $$ begin
  assert not public.record_site_activity(repeat('a',64),gen_random_uuid(),null,'Ciclos',true,'[]'), 'Rapid duplicate must be throttled';
end $$;
select set_config('request.jwt.claim.sub', current_setting('test.activity_owner'),true);
set local role authenticated;
do $$ begin
  assert public.is_owner(), 'Owner identity';
  perform public.owner_activity_snapshot(7,30);
  assert public.owner_activity_snapshot(7,30)->'resources' @> jsonb_build_array(jsonb_build_object('id',current_setting('test.activity_course'),'type','course')), 'Snapshot includes catalog usage';
  assert (select count(*) from public.site_activity_events where id=current_setting('test.activity_event')::uuid)=1, 'Owner reads telemetry';
end $$;
reset role;
select set_config('request.jwt.claim.sub',current_setting('test.activity_admin'),true);
set local role authenticated;
do $$
declare blocked boolean := false;
begin
  assert not public.is_owner(), 'Delegated admin identity';
  assert (select count(*) from public.site_activity_events)=0, 'RLS hides telemetry from delegated admins';
  assert (select count(*) from public.site_activity_sessions)=0, 'RLS hides presence from delegated admins';
  begin
    perform public.owner_activity_snapshot(7,30);
  exception when insufficient_privilege then blocked:=true;
  end;
  assert blocked, 'Snapshot must reject delegated admins';
  blocked:=false;
  begin
    update public.profiles set role='owner' where id=auth.uid();
  exception when insufficient_privilege then blocked:=true;
  end;
  assert blocked, 'Delegated admins cannot promote themselves';
  assert not has_function_privilege(current_user,'public.record_site_activity(text,uuid,uuid,text,boolean,jsonb)','EXECUTE'), 'Ingestion restricted to server';
end $$;
reset role;
rollback;
select 'PASS: owner allowed; delegated admin blocked; roles protected; duplicate throttled; test changes rolled back' as verification;
