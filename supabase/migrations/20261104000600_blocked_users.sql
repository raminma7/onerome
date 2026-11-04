-- Display names of the users I blocked (they are hidden from public_profiles).
create or replace function public.get_blocked_users()
returns table (user_id uuid, display_name text)
language sql
stable
security definer
set search_path = ''
as $$
  select b.blocked_id, p.display_name
  from public.blocks b
  join public.profiles p on p.id = b.blocked_id
  where b.blocker_id = (select auth.uid());
$$;

revoke execute on function public.get_blocked_users() from public, anon;
grant execute on function public.get_blocked_users() to authenticated;
