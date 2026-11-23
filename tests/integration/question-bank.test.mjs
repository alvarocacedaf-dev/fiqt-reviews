import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { PGlite } from '@electric-sql/pglite';
const db = new PGlite();
const user = '00000000-0000-0000-0000-000000000001';
const fingerprint = keys => createHash('sha256').update(JSON.stringify(keys)).digest('hex');
const bank = 'qu328-final';
before(async () => {
  await db.exec(`create role anon; create role authenticated; create role service_role;
    create schema auth; create table auth.users(id uuid primary key);
    create schema storage; create table storage.objects(bucket_id text,name text);
    alter table storage.objects enable row level security;
    grant usage on schema storage to authenticated;
    grant all on storage.objects to authenticated;
    create policy existing_admin_policy on storage.objects for all to authenticated using(true) with check(true);
    insert into auth.users values('${user}');
    create table public.admin_worksheets(id uuid primary key,course_id uuid,title text,exam_type text,preview_file_path text);`);
  for (const migration of ['065_unique_practice_exam_combinations','066_live_question_banks','067_exam_bank_history','068_seed_exam_history_pools']) {
    await db.exec(await readFile(`supabase/migrations/${migration}.sql`, 'utf8'));
  }
});
after(() => db.close());
async function reserve(keys, count, offset = 0, step = 1) {
  const result = await db.query('select * from reserve_live_exam_combination($1,$2,$3,$4,$5,$6,$7)', [user,bank,fingerprint(keys),keys,count,offset,step]);
  return result.rows[0];
}
function atRank(pool, count, rank) {
  const combos = [];
  function visit(start, chosen) {
    if (chosen.length === count) { combos.push(chosen.join(',')); return; }
    for (let i = start; i < pool.length; i++) visit(i+1,[...chosen,pool[i]]);
  }
  visit(0,[]); return combos[Number(rank)];
}
test('old permutations survive multiple bank expansions, including reordering keys', async () => {
  const oldKeys = ['b','c','d'];
  await db.query('insert into exam_bank_pools values($1,$2,$3,now())', [bank,fingerprint(oldKeys),oldKeys]);
  // 065 produced {c,d} then {b,c}: rank order 2,0,1.
  for (let i=0;i<2;i++) await db.query('select * from reserve_practice_exam_combination($1,$2,2,3,2,1)',[user,bank+':'+fingerprint(oldKeys)]);
  const used = new Set(['c,d','b,c']);
  const first = ['a','b','c','d'];
  for (let i=0;i<2;i++) {
    const r=await reserve(first,2,3,5); const combo=atRank(first,2,r.combination_rank);
    assert.equal(r.restarted,false); assert(!used.has(combo)); used.add(combo);
  }
  const expanded = ['a','b','c','d','e'];
  while (used.size<10) {
    const r=await reserve(expanded,2,2,3); const combo=atRank(expanded,2,r.combination_rank);
    assert.equal(r.restarted,false); assert(!used.has(combo),`Repeated ${combo}`); used.add(combo);
  }
  assert.equal((await reserve(expanded,2,2,3)).restarted,true);
});
test('parallel reservations cannot return the same combination', async () => {
  const keys=['a','b','c','d','e'];
  const results=await Promise.all(Array.from({length:10},()=>reserve(keys,3,0,3)));
  assert.equal(new Set(results.map(r=>r.combination_rank)).size,10);
});
test('continues past a large exhausted legacy pool without repeating it',async()=>{
  const another='00000000-0000-0000-0000-000000000002';
  await db.query('insert into auth.users values($1)',[another]);
  const old=Array.from({length:50},(_,i)=>String(i).padStart(2,'0'));
  const expanded=[...old,'new'];
  await db.query('insert into exam_bank_pools values($1,$2,$3,now())',[bank,fingerprint(old),old]);
  await db.query('insert into practice_exam_sequences(user_id,bank_key,question_count,total,cursor,permutation_offset,permutation_step) values($1,$2,2,1225,1225,0,1)',[another,bank+':'+fingerprint(old)]);
  const used=new Set();
  for(let i=0;i<50;i++) {
    let r;
    do {r=(await db.query('select * from reserve_live_exam_combination($1,$2,$3,$4,2,0,1)',[another,bank,fingerprint(expanded),expanded])).rows[0];} while(r.pending);
    const combo=atRank(expanded,2,r.combination_rank);
    assert(combo.includes('new'));assert(!used.has(combo));assert.equal(r.restarted,false);used.add(combo);
  }
  let next;
  do {next=(await db.query('select * from reserve_live_exam_combination($1,$2,$3,$4,2,0,1)',[another,bank,fingerprint(expanded),expanded])).rows[0];} while(next.pending);
  assert.equal(next.restarted,true);
});
test('queue trigger accepts the intended course and practice number only', async () => {
  const insert = async (id,course,title,type) => db.query('insert into admin_worksheets(id,course_id,title,exam_type) values($1,$2,$3,$4)',[id,course,title,type]);
  await insert('10000000-0000-0000-0000-000000000001','d0d588a3-9e52-4531-8e9a-75442c6f503e','Examen final 2018-1','final');
  await insert('10000000-0000-0000-0000-000000000002','5d448bf9-7246-4153-890e-c57283f0a254','Práctica calificada 2 de Física I 2026-2','practice');
  await insert('10000000-0000-0000-0000-000000000003','5d448bf9-7246-4153-890e-c57283f0a254','Práctica calificada 12 de Física I','practice');
  const jobs=await db.query('select * from exam_bank_jobs order by bank_key');
  assert.deepEqual(jobs.rows.map(j=>j.bank_key),['bfi01-pc2','qu328-final']);
  const claimed = await db.query('select * from claim_exam_bank_job($1)',[jobs.rows[0].id]);
  assert.equal(claimed.rows[0].status,'processing');
  assert.equal((await db.query('select * from claim_exam_bank_job($1)',[jobs.rows[0].id])).rows.length,0);
  await db.query("update exam_bank_jobs set status='waiting_pdf' where id=$1",[jobs.rows[0].id]);
  await db.query("update admin_worksheets set preview_file_path='preview.pdf' where id=$1",[jobs.rows[0].worksheet_id]);
  assert.equal((await db.query('select status from exam_bank_jobs where id=$1',[jobs.rows[0].id])).rows[0].status,'queued');
});
test('authenticated accounts cannot read drafts or reserve using service functions',async()=>{
  await db.query("insert into storage.objects values('admin-worksheets','question-bank/review/private.jpg'),('admin-worksheets','original.pdf')");
  await db.exec('set role authenticated');
  await assert.rejects(()=>db.query('select * from exam_bank_jobs'),/permission denied/);
  await assert.rejects(()=>reserve(['a','b'],1),/permission denied/);
  assert.deepEqual((await db.query('select name from storage.objects')).rows.map(r=>r.name),['original.pdf']);
  await db.exec('reset role');
});
test('oversized pools and missing historical pool metadata fail closed',async()=>{
  await assert.rejects(()=>reserve(['a','a'],1),/Invalid bank/);
  await db.query('insert into practice_exam_sequences(user_id,bank_key,question_count,total,permutation_offset,permutation_step) values($1,$2,1,2,0,1)',[user,bank+':missing']);
  await assert.rejects(()=>reserve(['a','b'],1),/Historical pool missing/);
  await db.query('delete from practice_exam_sequences where bank_key=$1',[bank+':missing']);
});
