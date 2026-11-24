import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
const db = new PGlite();
const user = '00000000-0000-0000-0000-000000000001';
before(async () => {
  await db.exec(`create role anon; create role authenticated; create schema auth;
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('test.uid',true),'')::uuid $$;
    grant usage on schema auth to authenticated;
    create function public.is_owner() returns boolean language sql as $$ select coalesce(current_setting('test.owner',true),'false') = 'true' $$;
    create function public.has_serious_chat_report_block(uuid) returns boolean language sql as $$ select coalesce(current_setting('test.blocked',true),'false') = 'true' $$;
    create function public.has_reward_campaign_full_access(uuid) returns boolean language sql as $$ select coalesce(current_setting('test.campaign',true),'false') = 'true' $$;
    create table reviews(user_id uuid,status text); create table worksheet_donations(user_id uuid,status text);`);
  await db.exec(await readFile('supabase/migrations/069_temporary_open_content_access.sql','utf8'));
});
after(() => db.close());
const access = async () => (await db.query('select has_open_content_access() as open, has_worksheet_access() as community')).rows[0];
test('opens new accounts without changing their contributions; rejects guests and another identity', async () => {
  assert.deepEqual(await access(),{open:false,community:false});
  await db.query("select set_config('test.uid',$1,false)",[user]);
  assert.deepEqual(await access(),{open:true,community:true});
  assert.equal((await db.query("select has_worksheet_access('00000000-0000-0000-0000-000000000002') as allowed")).rows[0].allowed,false);
  assert.equal((await db.query('select count(*)::int as n from reviews')).rows[0].n,0);
  assert.equal((await db.query("select has_function_privilege('anon','has_open_content_access()','execute') as allowed")).rows[0].allowed,false);
});
test('preserves moderation blocks and owner exception', async () => {
  await db.exec("set test.blocked = 'true'");
  assert.deepEqual(await access(),{open:true,community:false});
  await db.exec("set test.owner = 'true'");
  assert.equal((await access()).community,true);
  await db.exec("set test.owner = 'false'; set test.blocked = 'false'");
});
test('closing the switch restores thresholds and preserves campaign beneficiaries', async () => {
  await db.exec(`create or replace function public.has_open_content_access() returns boolean language sql stable security invoker set search_path=public as $$ select false $$`);
  assert.deepEqual(await access(),{open:false,community:false});
  await db.query("insert into reviews values($1,'approved'),($1,'approved');",[user]);
  await db.query("insert into worksheet_donations values($1,'approved');",[user]);
  assert.equal((await access()).community,true);
  await db.exec('delete from reviews; delete from worksheet_donations;');
  await db.exec("set test.campaign = 'true'");
  assert.equal((await access()).community,true);
});
