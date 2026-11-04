-- OneRome — per-photo face checks
-- After the one-time live selfie, every photo is checked automatically against
-- the verified photo (no new selfie needed):
--   solo        exactly the user, clear           → allowed, can be the cover
--   with_others the user together with others    → allowed, not as cover
--   unclear     the user, but blurry/small/dark   → allowed, not as cover
--   no_face     landscape, food, pets…            → allowed, not as cover
--   reviewed    approved by a moderator (manual)  → allowed, not as cover
--   mismatch    faces that are NOT the user       → never shown to others
--   unchecked   not checked yet                   → never shown to others
-- A profile is visible only if verified AND its cover photo is `solo`.

create type public.photo_face_status as enum ('unchecked', 'solo', 'with_others', 'unclear', 'no_face', 'reviewed', 'mismatch');

alter table public.profile_photos
  add column face_status public.photo_face_status not null default 'unchecked',
  add column face_similarity numeric(5, 2),
  add column face_checked_at timestamptz;

-- Existing verified photos are, by definition, the user alone.
update public.profile_photos ph set face_status = 'solo', face_checked_at = now()
from public.profiles p where p.verified_photo_id = ph.id;

-- Users can only choose which photos and their order; the face status is set by the server.
revoke insert, update on public.profile_photos from anon, authenticated;
grant insert (user_id, storage_path, position) on public.profile_photos to authenticated;
grant update (position) on public.profile_photos to authenticated;

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create or replace function private.photo_is_public(p_status public.photo_face_status)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select p_status in ('solo', 'with_others', 'unclear', 'no_face', 'reviewed');
$$;

create or replace function private.cover_is_solo(p_uid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((
    select face_status = 'solo' from public.profile_photos
    where user_id = p_uid order by position, created_at limit 1
  ), false);
$$;

-- ---------------------------------------------------------------------------
-- Visibility: verified + cover photo shows only the user
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
              and private.cover_is_solo(p_target)
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
     from public.profile_photos ph
     where ph.user_id = p.id
       and (ph.user_id = (select auth.uid()) or private.photo_is_public(ph.face_status))),
    '{}'
  ) as photo_paths
from public.profiles p
left join public.neighborhoods n on n.slug = p.neighborhood
where private.can_view_profile((select auth.uid()), p.id);

-- Photo rows: others only see checked, allowed photos.
drop policy if exists "photos visible" on public.profile_photos;
create policy "photos visible" on public.profile_photos for select to authenticated
  using (
    user_id = (select auth.uid())
    or public.is_admin()
    or (private.photo_is_public(face_status) and private.can_view_profile((select auth.uid()), user_id))
  );

-- Files: same rule, so a mismatched photo cannot be fetched even with its path.
drop policy if exists "profile photos read visible" on storage.objects;
create policy "profile photos read visible" on storage.objects for select to authenticated
  using (
    bucket_id = 'profile-photos'
    and (
      (storage.foldername(name))[1] = (select auth.uid())::text
      or public.is_admin()
      or exists (
        select 1 from public.profile_photos ph
        where ph.storage_path = name
          and private.photo_is_public(ph.face_status)
          and private.can_view_profile((select auth.uid()), ph.user_id)
      )
    )
  );

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
              from public.profile_photos ph
              where ph.user_id = p.id and private.photo_is_public(ph.face_status)), '{}'),
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
    and private.cover_is_solo(p.id)
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
  order by p.last_active_at desc
  limit least(greatest(coalesce(p_limit, 200), 1), 500);
end;
$$;

-- Likes also require a valid cover on the target side.
create or replace function private.is_verified(p_uid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.profiles where id = p_uid and verification = 'verified')
     and private.cover_is_solo(p_uid);
$$;

-- ---------------------------------------------------------------------------
-- Deleting the verified photo: move the verification to another `solo` photo
-- (already proven to be the same face); otherwise revoke it.
-- ---------------------------------------------------------------------------
create or replace function private.reset_verification_on_photo_delete()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_next uuid;
begin
  if not exists (select 1 from public.profiles where verified_photo_id = old.id and verification = 'verified') then
    return old;
  end if;
  select id into v_next from public.profile_photos
  where user_id = old.user_id and id <> old.id and face_status = 'solo'
  order by position, created_at limit 1;
  if v_next is not null then
    update public.profiles set verified_photo_id = v_next where id = old.user_id;
  else
    update public.profiles set verification = 'unverified', verified_photo_id = null, verified_at = null where id = old.user_id;
    perform private.notify(old.user_id, 'verification_status', jsonb_build_object('status', 'unverified'));
  end if;
  return old;
end;
$$;

-- Manual approval: the moderator confirms the cover shows the user and reviewed the rest.
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
  if p_approve then
    update public.profile_photos
    set face_status = case when id = v_photo then 'solo'::public.photo_face_status else 'reviewed'::public.photo_face_status end,
        face_checked_at = now()
    where user_id = v_user;
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

revoke execute on all functions in schema private from public, anon, authenticated;
grant execute on function private.is_connection_member(uuid, uuid) to authenticated;
grant execute on function private.can_view_profile(uuid, uuid) to authenticated;
grant execute on function private.age_years(date) to authenticated;
grant execute on function private.raise_error(text) to authenticated;
grant execute on function private.photo_is_public(public.photo_face_status) to authenticated;
revoke all on public.public_profiles from anon;
grant select on public.public_profiles to authenticated;
revoke execute on function public.get_discover_candidates(integer) from public, anon;
grant execute on function public.get_discover_candidates(integer) to authenticated;
revoke execute on function public.admin_review_verification(uuid, boolean) from public, anon;
grant execute on function public.admin_review_verification(uuid, boolean) to authenticated;
