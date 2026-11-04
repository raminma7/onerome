-- OneRome — security layer
-- Helper functions, integrity triggers, Row Level Security, grants and storage.

grant usage on schema private to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Helpers (SECURITY DEFINER, fixed search_path)
-- ---------------------------------------------------------------------------
create or replace function private.config_int(p_key text, p_default integer)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select (value #>> '{}')::integer from public.app_config where key = p_key), p_default);
$$;

create or replace function private.age_years(p_birth date)
returns integer
language sql
stable
set search_path = ''
as $$
  select extract(year from age(current_date, p_birth))::integer;
$$;

create or replace function private.is_admin(p_uid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = p_uid and role = 'admin' and deleted_at is null and suspended_at is null
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_admin((select auth.uid()));
$$;

create or replace function private.is_connection_member(p_connection uuid, p_uid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.connection_participants
    where connection_id = p_connection and user_id = p_uid
  );
$$;

create or replace function private.is_blocked_between(p_a uuid, p_b uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.blocks
    where (blocker_id = p_a and blocked_id = p_b) or (blocker_id = p_b and blocked_id = p_a)
  );
$$;

create or replace function private.active_connection_id(p_uid uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select connection_id from public.connection_participants where user_id = p_uid and is_active;
$$;

-- Subscription truth comes only from webhook-written rows, never from the client.
create or replace function private.has_active_subscription(p_uid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.subscriptions
    where user_id = p_uid
      and status in ('active', 'trialing')
      and (current_period_end is null or current_period_end > now())
  );
$$;

-- A profile is "available" when it is complete, not suspended, not deleted.
create or replace function private.is_available(p_uid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = p_uid
      and onboarding_completed_at is not null
      and deleted_at is null
      and suspended_at is null
  );
$$;

-- Users that have (or had) a match with each other may see each other's
-- public profile even when one of them is hidden.
create or replace function private.has_match_between(p_a uuid, p_b uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.matches
    where user_low = least(p_a, p_b) and user_high = greatest(p_a, p_b)
  );
$$;

create or replace function private.can_view_profile(p_viewer uuid, p_target uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_viewer is not null and (
    p_viewer = p_target
    or private.is_admin(p_viewer)
    or (
      not private.is_blocked_between(p_viewer, p_target)
      and exists (
        select 1 from public.profiles p
        where p.id = p_target
          and p.onboarding_completed_at is not null
          and p.deleted_at is null
          and p.suspended_at is null
          and (
            not p.is_hidden
            or private.has_match_between(p_viewer, p_target)
            or exists (select 1 from public.likes l where l.from_user = p_target and l.to_user = p_viewer)
          )
      )
    )
  );
$$;

create or replace function private.raise_error(p_code text)
returns void
language plpgsql
set search_path = ''
as $$
begin
  -- Error codes are stable identifiers translated by the clients (errors.<code>).
  raise exception using errcode = 'P0001', message = p_code;
end;
$$;

create or replace function private.notify(p_user uuid, p_type public.notification_type, p_data jsonb default '{}')
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.notifications (user_id, type, data) values (p_user, p_type, coalesce(p_data, '{}'));
$$;

create or replace function private.enforce_rate_limit(p_uid uuid, p_action text, p_max integer, p_window interval)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  select count(*) into v_count
  from private.rate_limit_events
  where user_id = p_uid and action = p_action and created_at > now() - p_window;
  if v_count >= p_max then
    perform private.raise_error('rate_limited');
  end if;
  insert into private.rate_limit_events (user_id, action) values (p_uid, p_action);
end;
$$;

-- ---------------------------------------------------------------------------
-- New user bootstrap + age gate
-- ---------------------------------------------------------------------------
create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_birth date;
  v_locale public.app_locale := 'it';
begin
  begin
    v_birth := nullif(new.raw_user_meta_data ->> 'birth_date', '')::date;
  exception when others then
    v_birth := null;
  end;
  if v_birth is not null and private.age_years(v_birth) < 18 then
    raise exception using errcode = 'P0001', message = 'underage';
  end if;
  if (new.raw_user_meta_data ->> 'locale') in ('it', 'en') then
    v_locale := (new.raw_user_meta_data ->> 'locale')::public.app_locale;
  end if;

  insert into public.profiles (id, birth_date, locale) values (new.id, v_birth, v_locale);
  insert into public.preferences (user_id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

create or replace function private.profiles_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.birth_date is not null and private.age_years(new.birth_date) < 18 then
    perform private.raise_error('underage');
  end if;
  if tg_op = 'UPDATE'
     and old.birth_date is not null
     and new.birth_date is distinct from old.birth_date
     and current_user in ('authenticated', 'anon') then
    perform private.raise_error('birth_date_locked');
  end if;
  return new;
end;
$$;

create trigger profiles_guard before insert or update on public.profiles
  for each row execute function private.profiles_guard();

create or replace function private.photos_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select count(*) from public.profile_photos where user_id = new.user_id)
       >= private.config_int('max_profile_photos', 6) then
    perform private.raise_error('too_many_photos');
  end if;
  if split_part(new.storage_path, '/', 1) <> new.user_id::text then
    perform private.raise_error('invalid_photo_path');
  end if;
  return new;
end;
$$;

create trigger profile_photos_guard before insert on public.profile_photos
  for each row execute function private.photos_guard();

-- ---------------------------------------------------------------------------
-- Public profile projection: never exposes birth date, role, moderation data.
-- Runs with owner rights but filters by private.can_view_profile().
-- ---------------------------------------------------------------------------
create or replace view public.public_profiles
with (security_barrier = true)
as
select
  p.id,
  p.display_name,
  private.age_years(p.birth_date) as age,
  p.gender,
  p.bio,
  p.neighborhood,
  n.name as neighborhood_name,
  n.zone as neighborhood_zone,
  p.occupation,
  p.education,
  p.languages,
  p.interests,
  p.personality,
  p.core_values,
  p.lifestyle,
  p.relationship_goal,
  (p.verification = 'verified') as is_verified,
  coalesce(
    (select array_agg(ph.storage_path order by ph.position, ph.created_at)
     from public.profile_photos ph where ph.user_id = p.id),
    '{}'
  ) as photo_paths
from public.profiles p
left join public.neighborhoods n on n.slug = p.neighborhood
where private.can_view_profile((select auth.uid()), p.id);

revoke all on public.public_profiles from anon;
grant select on public.public_profiles to authenticated;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.app_config enable row level security;
alter table public.neighborhoods enable row level security;
alter table public.profiles enable row level security;
alter table public.preferences enable row level security;
alter table public.profile_photos enable row level security;
alter table public.consents enable row level security;
alter table public.verification_requests enable row level security;
alter table public.likes enable row level security;
alter table public.passes enable row level security;
alter table public.blocks enable row level security;
alter table public.matches enable row level security;
alter table public.connections enable row level security;
alter table public.connection_participants enable row level security;
alter table public.messages enable row level security;
alter table public.stripe_customers enable row level security;
alter table public.subscriptions enable row level security;
alter table public.stripe_events enable row level security;
alter table public.notifications enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.venues enable row level security;
alter table public.date_plans enable row level security;
alter table public.booking_requests enable row level security;
alter table public.reports enable row level security;
alter table public.admin_audit_log enable row level security;

-- Config & reference data
create policy "config readable" on public.app_config for select to authenticated using (true);
create policy "config admin write" on public.app_config for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy "neighborhoods readable" on public.neighborhoods for select to anon, authenticated using (true);

-- Profiles: full row only for the owner and admins. Others use public_profiles.
create policy "own profile read" on public.profiles for select to authenticated
  using (id = (select auth.uid()) or public.is_admin());
create policy "own profile update" on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

revoke insert, update, delete on public.profiles from anon, authenticated;
grant update (
  display_name, birth_date, gender, bio, neighborhood, occupation, education,
  languages, interests, personality, core_values, lifestyle, relationship_goal,
  locale, notify_likes, is_hidden, last_active_at
) on public.profiles to authenticated;

create policy "own preferences read" on public.preferences for select to authenticated
  using (user_id = (select auth.uid()));
create policy "own preferences update" on public.preferences for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
revoke insert, delete on public.preferences from anon, authenticated;

create policy "photos visible" on public.profile_photos for select to authenticated
  using (private.can_view_profile((select auth.uid()), user_id));
create policy "own photos insert" on public.profile_photos for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "own photos update" on public.profile_photos for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "own photos delete" on public.profile_photos for delete to authenticated
  using (user_id = (select auth.uid()));

create policy "own consents read" on public.consents for select to authenticated
  using (user_id = (select auth.uid()));
create policy "own consents insert" on public.consents for insert to authenticated
  with check (user_id = (select auth.uid()));
revoke update, delete on public.consents from anon, authenticated;

create policy "own verification read" on public.verification_requests for select to authenticated
  using (user_id = (select auth.uid()) or public.is_admin());
revoke insert, update, delete on public.verification_requests from anon, authenticated;

-- Likes & co. are written only through RPCs.
create policy "likes involving me" on public.likes for select to authenticated
  using (from_user = (select auth.uid()) or to_user = (select auth.uid()));
create policy "own passes" on public.passes for select to authenticated
  using (from_user = (select auth.uid()));
create policy "own blocks" on public.blocks for select to authenticated
  using (blocker_id = (select auth.uid()));
create policy "my matches" on public.matches for select to authenticated
  using ((select auth.uid()) in (user_low, user_high));
revoke insert, update, delete on public.likes, public.passes, public.blocks, public.matches from anon, authenticated;

create policy "my connections" on public.connections for select to authenticated
  using ((select auth.uid()) in (user_low, user_high) or private.is_connection_member(id, (select auth.uid())));
create policy "my connection participants" on public.connection_participants for select to authenticated
  using (private.is_connection_member(connection_id, (select auth.uid())));
create policy "messages of my connections" on public.messages for select to authenticated
  using (private.is_connection_member(connection_id, (select auth.uid())));
revoke insert, update, delete on public.connections, public.connection_participants, public.messages
  from anon, authenticated;

-- Billing: read-only for the owner, written by the service role only.
create policy "own customer" on public.stripe_customers for select to authenticated
  using (user_id = (select auth.uid()));
create policy "own subscriptions" on public.subscriptions for select to authenticated
  using (user_id = (select auth.uid()) or public.is_admin());
revoke insert, update, delete on public.stripe_customers, public.subscriptions from anon, authenticated;
revoke all on public.stripe_events from anon, authenticated;

-- Notifications: owner may read, mark as read and delete.
create policy "own notifications read" on public.notifications for select to authenticated
  using (user_id = (select auth.uid()));
create policy "own notifications update" on public.notifications for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "own notifications delete" on public.notifications for delete to authenticated
  using (user_id = (select auth.uid()));
revoke insert, update on public.notifications from anon, authenticated;
grant update (read_at) on public.notifications to authenticated;

create policy "own push subscriptions" on public.push_subscriptions for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- Venues: public catalogue, admin-managed.
create policy "active venues readable" on public.venues for select to anon, authenticated
  using (is_active or public.is_admin());
create policy "admin venues insert" on public.venues for insert to authenticated with check (public.is_admin());
create policy "admin venues update" on public.venues for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy "admin venues delete" on public.venues for delete to authenticated using (public.is_admin());

create policy "my date plans" on public.date_plans for select to authenticated
  using (private.is_connection_member(connection_id, (select auth.uid())) or public.is_admin());
create policy "my bookings" on public.booking_requests for select to authenticated
  using (
    public.is_admin() or exists (
      select 1 from public.date_plans dp
      where dp.id = date_plan_id and private.is_connection_member(dp.connection_id, (select auth.uid()))
    )
  );
revoke insert, update, delete on public.date_plans, public.booking_requests from anon, authenticated;

-- Reports: the reporter sees their own reports (without the evidence column).
create policy "own reports" on public.reports for select to authenticated
  using (reporter_id = (select auth.uid()));
revoke all on public.reports from anon, authenticated;
grant select (id, reporter_id, reported_user_id, reason, status, created_at) on public.reports to authenticated;

revoke all on public.admin_audit_log from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Function privileges: nothing in `private` is callable by API roles,
-- except the helpers used inside RLS policies.
-- ---------------------------------------------------------------------------
revoke execute on all functions in schema private from public, anon, authenticated;
grant execute on function private.is_connection_member(uuid, uuid) to authenticated;
grant execute on function private.can_view_profile(uuid, uuid) to authenticated;
grant execute on function private.age_years(date) to authenticated;
grant execute on function private.raise_error(text) to authenticated;
revoke execute on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

-- ---------------------------------------------------------------------------
-- Storage: private buckets, per-user folders `<uid>/<file>`
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('profile-photos', 'profile-photos', false, 5242880, array['image/jpeg', 'image/png', 'image/webp']),
  ('verification', 'verification', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "profile photos upload own folder" on storage.objects for insert to authenticated
  with check (bucket_id = 'profile-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "profile photos delete own" on storage.objects for delete to authenticated
  using (bucket_id = 'profile-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "profile photos read visible" on storage.objects for select to authenticated
  using (
    bucket_id = 'profile-photos'
    and private.can_view_profile((select auth.uid()), ((storage.foldername(name))[1])::uuid)
  );

create policy "verification upload own folder" on storage.objects for insert to authenticated
  with check (bucket_id = 'verification' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "verification read own or admin" on storage.objects for select to authenticated
  using (
    bucket_id = 'verification'
    and ((storage.foldername(name))[1] = (select auth.uid())::text or public.is_admin())
  );
