begin;
create function public.exam_choose(n integer,k integer) returns bigint
language plpgsql immutable strict set search_path=public as $$
declare v numeric:=1; i integer;
begin
 if k<0 or k>n then return 0; end if;
 for i in 1..k loop v:=v*(n-i+1)/i; end loop;
 return round(v)::bigint;
end $$;
create function public.exam_inverse(a bigint,m bigint) returns bigint
language plpgsql immutable strict set search_path=public as $$
declare t numeric:=0; nt numeric:=1; r numeric:=m; nr numeric:=a; q numeric; tmp numeric;
begin
 if m=1 then return 0; end if;
 while nr<>0 loop
   q:=trunc(r/nr); tmp:=nt; nt:=t-q*nt; t:=tmp; tmp:=nr; nr:=r-q*nr; r:=tmp;
 end loop;
 if r<>1 then raise exception 'Invalid permutation'; end if;
 return mod(mod(t,m)+m,m)::bigint;
end $$;

create function public.reserve_live_exam_combination(
 p_user_id uuid,p_bank_key text,p_fingerprint text,p_keys text[],p_count integer,p_offset bigint,p_step bigint)
returns table(combination_rank bigint,restarted boolean,pending boolean)
language plpgsql security definer set search_path=public as $$
declare s public.practice_exam_sequences; old record; total_count bigint; candidate_rank bigint;
 remaining bigint; block bigint; chosen text[]; i integer; j integer; indices integer[];
 previous_index integer; old_rank bigint; position_in_sequence bigint; used boolean; attempts integer:=0;
begin
 if p_bank_key not in ('bfi01-pc1','bfi01-pc2','qu328-final') or p_count not between 1 and 6
   or cardinality(p_keys)<p_count or cardinality(p_keys)>500
   or cardinality(p_keys)<>(select count(distinct x) from unnest(p_keys) x)
   or length(p_fingerprint)<>64 then raise exception 'Invalid bank'; end if;
 total_count:=public.exam_choose(cardinality(p_keys),p_count);
 if total_count>281474976710655 or p_offset<0 or p_offset>=total_count or p_step<1
   or p_step>greatest(1,total_count-1) then raise exception 'Invalid permutation'; end if;
 perform public.exam_inverse(p_step,total_count);
 perform pg_advisory_xact_lock(hashtextextended(p_user_id::text||p_bank_key||p_count::text,0));
 insert into public.exam_bank_pools(bank_key,fingerprint,keys) values(p_bank_key,p_fingerprint,p_keys) on conflict do nothing;
 if (select keys from public.exam_bank_pools where bank_key=p_bank_key and fingerprint=p_fingerprint)<>p_keys then
   raise exception 'Pool mismatch'; end if;
 -- Missing historical pools must never silently reset the user's history.
 if exists(select 1 from public.practice_exam_sequences h where h.user_id=p_user_id
   and h.bank_key like p_bank_key||':%' and not exists(select 1 from public.exam_bank_pools b
   where b.bank_key=p_bank_key and h.bank_key=b.bank_key||':'||b.fingerprint)) then
   raise exception 'Historical pool missing; run the history seed migration'; end if;
 insert into public.practice_exam_sequences(user_id,bank_key,question_count,total,permutation_offset,permutation_step)
 values(p_user_id,p_bank_key||':'||p_fingerprint,p_count,total_count,p_offset,p_step) on conflict do nothing;
 select * into s from public.practice_exam_sequences where user_id=p_user_id
   and bank_key=p_bank_key||':'||p_fingerprint and question_count=p_count for update;
 if s.total<>total_count then raise exception 'Total mismatch'; end if;
 restarted:=false; pending:=false;
 loop
   if s.cursor>=s.total then
     s.cursor:=0; s.rounds:=s.rounds+1; restarted:=true;
     -- Do not start the new round with the last combination of the previous one.
     if s.total>1 and p_offset=mod(s.permutation_offset::numeric+(s.total-1)::numeric*s.permutation_step,s.total) then
       p_offset:=mod(p_offset+1,s.total);
     end if;
     s.permutation_offset:=p_offset; s.permutation_step:=p_step;
   end if;
   candidate_rank:=mod(s.permutation_offset::numeric+s.cursor::numeric*s.permutation_step,s.total)::bigint;
   remaining:=candidate_rank; chosen:='{}';
   for i in 1..cardinality(p_keys) loop
     exit when cardinality(chosen)=p_count;
     block:=public.exam_choose(cardinality(p_keys)-i,p_count-cardinality(chosen)-1);
     if remaining<block then chosen:=array_append(chosen,p_keys[i]); else remaining:=remaining-block; end if;
   end loop;
   used:=false;
   if s.rounds=0 then
     for old in select h.*,b.keys from public.practice_exam_sequences h join public.exam_bank_pools b
       on h.bank_key=b.bank_key||':'||b.fingerprint
       where h.user_id=p_user_id and h.question_count=p_count and b.bank_key=p_bank_key
         and b.fingerprint<>p_fingerprint and h.cursor>0 loop
       if not chosen <@ old.keys then continue; end if;
       if old.rounds>0 then used:=true; exit; end if;
       select array_agg(array_position(old.keys,x) order by array_position(old.keys,x)) into indices from unnest(chosen) x;
       old_rank:=0; previous_index:=0;
       for i in 1..p_count loop
         for j in previous_index+1..indices[i]-1 loop
           old_rank:=old_rank+public.exam_choose(cardinality(old.keys)-j,p_count-i);
         end loop;
         previous_index:=indices[i];
       end loop;
       position_in_sequence:=mod(mod((old_rank-old.permutation_offset)::numeric*public.exam_inverse(old.permutation_step,old.total),old.total)+old.total,old.total)::bigint;
       if position_in_sequence<old.cursor then used:=true; exit; end if;
     end loop;
   end if;
   s.cursor:=s.cursor+1; attempts:=attempts+1;
   if not used then combination_rank:=candidate_rank; exit; end if;
   if attempts>=1000 then pending:=true; combination_rank:=null; exit; end if;
 end loop;
 update public.practice_exam_sequences set cursor=s.cursor,rounds=s.rounds,permutation_offset=s.permutation_offset,
   permutation_step=s.permutation_step,updated_at=now()
   where user_id=p_user_id and bank_key=s.bank_key and question_count=p_count;
 return next;
end $$;
revoke all on function public.exam_choose(integer,integer),public.exam_inverse(bigint,bigint),
 public.reserve_live_exam_combination(uuid,text,text,text[],integer,bigint,bigint) from public,anon,authenticated;
grant execute on function public.reserve_live_exam_combination(uuid,text,text,text[],integer,bigint,bigint) to service_role;
commit;
