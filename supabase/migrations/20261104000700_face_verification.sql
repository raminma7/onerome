-- OneRome — mandatory face verification
-- A profile becomes visible to other users only after a successful face
-- verification: a live selfie (AWS Rekognition Face Liveness) must match the
-- user's cover photo (CompareFaces). Until then the user can only browse.
--
-- Biometric data is NOT stored: only the outcome and the scores are kept.

alter type public.consent_kind add value if not exists 'biometric';

alter table public.profiles
  add column verified_photo_id uuid references public.profile_photos (id) on delete set null,
  add column verified_at timestamptz;

create type public.face_verification_status as enum ('started', 'passed', 'failed', 'error');

create table public.face_verifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  provider text not null default 'aws_rekognition',
  liveness_session_id text unique,
  photo_id uuid references public.profile_photos (id) on delete set null,
  status public.face_verification_status not null default 'started',
  liveness_confidence numeric(5, 2),
  similarity numeric(5, 2),
  failure_reason text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);
create index face_verifications_user_idx on public.face_verifications (user_id, created_at desc);

alter table public.face_verifications enable row level security;
create policy "own face verifications" on public.face_verifications for select to authenticated
  using (user_id = (select auth.uid()) or public.is_admin());
-- Written only by trusted server code with the service role.
revoke insert, update, delete on public.face_verifications from anon, authenticated;

insert into public.app_config (key, value, description) values
  ('face_verification_daily_attempts', '5', 'Maximum face verification attempts per user per 24h')
on conflict (key) do nothing;

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create or replace function private.is_verified(p_uid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.profiles where id = p_uid and verification = 'verified');
$$;

-- Losing the verified photo means losing the verification.
create or replace function private.reset_verification_on_photo_delete()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles
  set verification = 'unverified', verified_photo_id = null, verified_at = null
  where verified_photo_id = old.id and verification = 'verified';
  if found then
    perform private.notify(old.user_id, 'verification_status', jsonb_build_object('status', 'unverified'));
  end if;
  return old;
end;
$$;

create trigger profile_photos_reset_verification
  before delete on public.profile_photos
  for each row execute function private.reset_verification_on_photo_delete();

-- ---------------------------------------------------------------------------
-- Visibility: unverified profiles are invisible to everyone else
-- (existing matches keep seeing each other, e.g. after a photo change).
-- ---------------------------------------------------------------------------
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
            private.has_match_between(p_viewer, p_target)
            or (
              p.verification = 'verified'
              and (
                not p.is_hidden
                or exists (select 1 from public.likes l where l.from_user = p_target and l.to_user = p_viewer)
              )
            )
          )
      )
    )
  );
$$;

create or replace function public.get_discover_candidates(p_limit integer default 200)
returns table (
  id uuid,
  display_name text,
  age integer,
  gender public.gender,
  bio text,
  neighborhood text,
  neighborhood_name text,
  neighborhood_zone text,
  occupation text,
  education text,
  languages text[],
  interests text[],
  personality text[],
  core_values text[],
  lifestyle jsonb,
  relationship_goal public.relationship_goal,
  is_verified boolean,
  photo_paths text[],
  pref_goals public.relationship_goal[]
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.require_available_user();
  me public.profiles;
  my_pref public.preferences;
  my_age integer;
begin
  if private.active_connection_id(v_uid) is not null then
    perform private.raise_error('exclusive_connection_active');
  end if;

  select * into me from public.profiles where profiles.id = v_uid;
  select * into my_pref from public.preferences where user_id = v_uid;
  my_age := private.age_years(me.birth_date);

  return query
  select
    p.id, p.display_name, private.age_years(p.birth_date), p.gender, p.bio,
    p.neighborhood, n.name, n.zone, p.occupation, p.education, p.languages,
    p.interests, p.personality, p.core_values, p.lifestyle, p.relationship_goal,
    true,
    coalesce((select array_agg(ph.storage_path order by ph.position, ph.created_at)
              from public.profile_photos ph where ph.user_id = p.id), '{}'),
    cp.goals
  from public.profiles p
  join public.preferences cp on cp.user_id = p.id
  join auth.users u on u.id = p.id
  left join public.neighborhoods n on n.slug = p.neighborhood
  where p.id <> v_uid
    and p.onboarding_completed_at is not null
    and p.deleted_at is null
    and p.suspended_at is null
    and not p.is_hidden
    and p.verification = 'verified'
    and u.email_confirmed_at is not null
    and p.gender = any (my_pref.interested_in)
    and me.gender = any (cp.interested_in)
    and private.age_years(p.birth_date) between my_pref.age_min and my_pref.age_max
    and my_age between cp.age_min and cp.age_max
    and (cardinality(my_pref.goals) = 0 or p.relationship_goal = any (my_pref.goals))
    and (cardinality(cp.goals) = 0 or me.relationship_goal = any (cp.goals))
    and not exists (select 1 from public.connection_participants cpa where cpa.user_id = p.id and cpa.is_active)
    and not exists (select 1 from public.likes l where l.from_user = v_uid and l.to_user = p.id)
    and not exists (select 1 from public.passes ps where ps.from_user = v_uid and ps.to_user = p.id)
    and not exists (
      select 1 from public.blocks b
      where (b.blocker_id = v_uid and b.blocked_id = p.id) or (b.blocker_id = p.id and b.blocked_id = v_uid)
    )
    and not exists (
      select 1 from public.matches m
      where m.user_low = least(v_uid, p.id) and m.user_high = greatest(v_uid, p.id)
    )
    and exists (select 1 from public.profile_photos ph2 where ph2.user_id = p.id)
  order by p.last_active_at desc
  limit least(greatest(coalesce(p_limit, 200), 1), 500);
end;
$$;

-- ---------------------------------------------------------------------------
-- Interactions require a verified identity (unverified users can only browse)
-- ---------------------------------------------------------------------------
create or replace function public.like_profile(p_target uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.require_available_user();
  v_inserted integer;
  v_match uuid;
  v_target_notify boolean;
begin
  if p_target is null or p_target = v_uid then
    perform private.raise_error('invalid_target');
  end if;
  if not private.is_verified(v_uid) then
    perform private.raise_error('verification_required');
  end if;

  perform private.lock_users(v_uid, p_target);

  if private.active_connection_id(v_uid) is not null then
    perform private.raise_error('exclusive_connection_active');
  end if;
  if not private.is_available(p_target)
     or not private.is_verified(p_target)
     or private.active_connection_id(p_target) is not null
     or private.is_blocked_between(v_uid, p_target)
     or exists (select 1 from public.profiles where id = p_target and is_hidden) then
    perform private.raise_error('target_unavailable');
  end if;

  perform private.enforce_rate_limit(v_uid, 'like', private.config_int('daily_like_limit', 150), interval '24 hours');

  insert into public.likes (from_user, to_user) values (v_uid, p_target) on conflict do nothing;
  get diagnostics v_inserted = row_count;
  delete from public.passes where from_user = v_uid and to_user = p_target;

  if exists (select 1 from public.likes where from_user = p_target and to_user = v_uid) then
    insert into public.matches (user_low, user_high)
    values (least(v_uid, p_target), greatest(v_uid, p_target))
    on conflict (user_low, user_high) do nothing
    returning id into v_match;

    if v_match is not null then
      perform private.notify(v_uid, 'mutual_match', jsonb_build_object('match_id', v_match, 'user_id', p_target));
      perform private.notify(p_target, 'mutual_match', jsonb_build_object('match_id', v_match, 'user_id', v_uid));
    else
      select id into v_match from public.matches
      where user_low = least(v_uid, p_target) and user_high = greatest(v_uid, p_target);
    end if;
    return jsonb_build_object('status', 'matched', 'match_id', v_match);
  end if;

  if v_inserted > 0 then
    select notify_likes into v_target_notify from public.profiles where id = p_target;
    if v_target_notify then
      perform private.notify(p_target, 'like_received', '{}'::jsonb);
    end if;
  end if;
  return jsonb_build_object('status', 'liked');
end;
$$;

-- start_connection: add the verification requirement for both people.
create or replace function private.assert_both_verified(p_a uuid, p_b uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_verified(p_a) then
    perform private.raise_error('verification_required');
  end if;
  if not private.is_verified(p_b) then
    perform private.raise_error('partner_unavailable');
  end if;
end;
$$;

create or replace function public.start_connection(p_match_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.require_available_user();
  m public.matches;
  v_partner uuid;
  v_connection uuid;
begin
  select * into m from public.matches where id = p_match_id and v_uid in (user_low, user_high);
  if not found then
    perform private.raise_error('match_not_found');
  end if;
  v_partner := case when m.user_low = v_uid then m.user_high else m.user_low end;

  perform private.lock_users(m.user_low, m.user_high);

  select * into m from public.matches where id = p_match_id;
  if m.status <> 'active' or exists (select 1 from public.connections where match_id = m.id) then
    perform private.raise_error('match_closed');
  end if;
  if not private.is_available(v_partner) or private.is_blocked_between(v_uid, v_partner) then
    perform private.raise_error('partner_unavailable');
  end if;
  perform private.assert_both_verified(v_uid, v_partner);
  if not private.has_active_subscription(v_uid) then
    perform private.raise_error('subscription_required');
  end if;
  if not private.has_active_subscription(v_partner) then
    perform private.raise_error('partner_subscription_required');
  end if;
  if private.active_connection_id(v_uid) is not null then
    perform private.raise_error('exclusive_connection_active');
  end if;
  if private.active_connection_id(v_partner) is not null then
    perform private.raise_error('partner_in_connection');
  end if;

  insert into public.connections (match_id, user_low, user_high, started_by, pending_since)
  values (m.id, m.user_low, m.user_high, v_uid, now())
  returning id into v_connection;

  insert into public.connection_participants (connection_id, user_id)
  values (v_connection, m.user_low), (v_connection, m.user_high);

  perform private.notify(v_partner, 'connection_started',
    jsonb_build_object('connection_id', v_connection, 'user_id', v_uid));
  return v_connection;
exception
  when unique_violation then
    perform private.raise_error('exclusive_connection_active');
end;
$$;

-- Manual review (fallback when automatic verification is unavailable or fails):
-- approving binds the verification to the current cover photo.
create or replace function public.admin_review_verification(p_request uuid, p_approve boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin uuid := private.require_admin();
  v_user uuid;
  v_photo uuid;
  v_status public.verification_status := case when p_approve then 'verified' else 'rejected' end;
begin
  update public.verification_requests
  set status = v_status, reviewed_by = v_admin, reviewed_at = now()
  where id = p_request and status = 'pending'
  returning user_id into v_user;
  if v_user is null then
    perform private.raise_error('not_found');
  end if;
  select id into v_photo from public.profile_photos where user_id = v_user order by position, created_at limit 1;
  if p_approve and v_photo is null then
    perform private.raise_error('photo_required');
  end if;
  update public.profiles
  set verification = v_status,
      verified_photo_id = case when p_approve then v_photo end,
      verified_at = case when p_approve then now() end
  where id = v_user;
  perform private.notify(v_user, 'verification_status', jsonb_build_object('status', v_status));
  perform private.audit(v_admin, 'review_verification', 'user', v_user::text, jsonb_build_object('approved', p_approve, 'method', 'manual'));
end;
$$;

-- Privileges
revoke execute on all functions in schema private from public, anon, authenticated;
grant execute on function private.is_connection_member(uuid, uuid) to authenticated;
grant execute on function private.can_view_profile(uuid, uuid) to authenticated;
grant execute on function private.age_years(date) to authenticated;
grant execute on function private.raise_error(text) to authenticated;
revoke execute on function public.get_discover_candidates(integer) from public, anon;
grant execute on function public.get_discover_candidates(integer) to authenticated;
revoke execute on function public.like_profile(uuid) from public, anon;
grant execute on function public.like_profile(uuid) to authenticated;
revoke execute on function public.start_connection(uuid) from public, anon;
grant execute on function public.start_connection(uuid) to authenticated;
revoke execute on function public.admin_review_verification(uuid, boolean) from public, anon;
grant execute on function public.admin_review_verification(uuid, boolean) to authenticated;
