-- Temporary access to content for signed-in users. No earned progress or roles change.
-- To restore the reward requirements later, replace only has_open_content_access()
-- with a function returning false. Keep the same signature and grants.
begin;
create or replace function public.has_open_content_access()
returns boolean language sql stable security invoker set search_path = public
as $$ select auth.uid() is not null $$;
revoke all on function public.has_open_content_access() from public, anon;
grant execute on function public.has_open_content_access() to authenticated;

create or replace function public.has_worksheet_access(p_user_id uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public
as $$
  select coalesce(
    p_user_id = auth.uid()
    and (
      public.is_owner()
      or (
        not public.has_serious_chat_report_block(p_user_id)
        and (
          public.has_open_content_access()
          or public.has_reward_campaign_full_access(p_user_id)
          or ((select count(*) from public.reviews where user_id = p_user_id and status = 'approved') >= 2
            and (
              (select count(*) from public.reviews where user_id = p_user_id and status = 'approved')
              + (select count(*) from public.worksheet_donations where user_id = p_user_id and status = 'approved')
            ) >= 3)
        )
      )
    ), false)
$$;
revoke all on function public.has_worksheet_access(uuid) from public, anon;
grant execute on function public.has_worksheet_access(uuid) to authenticated;
commit;
