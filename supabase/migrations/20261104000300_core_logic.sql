-- OneRome — business logic
-- Every state-changing rule (likes, matches, exclusive connections, chat,
-- 72h timer, first date) is enforced here, atomically, so that web and future
-- native clients share exactly the same behaviour.
--
-- Locking convention: whenever two users are involved, their `profiles` rows
-- are locked with SELECT ... FOR UPDATE ordered by id. This serialises likes,
-- connection starts and blocks touching the same users and prevents deadlocks.

create or replace function private.lock_users(p_a uuid, p_b uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform 1 from public.profiles where id in (p_a, p_b) order by id for update;
end;
$$;

create or replace function private.require_user()
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    perform private.raise_error('not_authenticated');
  end if;
  return v_uid;
end;
$$;

create or replace function private.require_available_user()
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.require_user();
  v_profile public.profiles;
begin
  select * into v_profile from public.profiles where id = v_uid;
  if not found or v_profile.deleted_at is not null then
    perform private.raise_error('account_unavailable');
  end if;
  if v_profile.suspended_at is not null then
    perform private.raise_error('account_suspended');
  end if;
  if v_profile.onboarding_completed_at is null then
    perform private.raise_error('onboarding_incomplete');
  end if;
  return v_uid;
end;
$$;

-- ---------------------------------------------------------------------------
-- Onboarding
-- ---------------------------------------------------------------------------
create or replace function public.complete_onboarding()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.require_user();
  p public.profiles;
  pr public.preferences;
begin
  select * into p from public.profiles where id = v_uid for update;
  select * into pr from public.preferences where user_id = v_uid;

  if p.display_name is null or p.birth_date is null or p.gender is null
     or p.neighborhood is null or p.relationship_goal is null then
    perform private.raise_error('profile_incomplete');
  end if;
  if private.age_years(p.birth_date) < 18 then
    perform private.raise_error('underage');
  end if;
  if cardinality(p.interests) < 3 or cardinality(p.languages) < 1 then
    perform private.raise_error('profile_incomplete');
  end if;
  if pr.user_id is null or cardinality(pr.interested_in) < 1 then
    perform private.raise_error('preferences_incomplete');
  end if;
  if not exists (select 1 from public.profile_photos where user_id = v_uid) then
    perform private.raise_error('photo_required');
  end if;
  if not exists (
       select 1 from (
         select distinct on (kind) kind, granted from public.consents
         where user_id = v_uid order by kind, created_at desc
       ) c where c.kind = 'terms' and c.granted)
     or not exists (
       select 1 from (
         select distinct on (kind) kind, granted from public.consents
         where user_id = v_uid order by kind, created_at desc
       ) c where c.kind = 'sensitive_data' and c.granted) then
    perform private.raise_error('consent_required');
  end if;

  update public.profiles
  set onboarding_completed_at = coalesce(onboarding_completed_at, now())
  where id = v_uid;
end;
$$;

-- ---------------------------------------------------------------------------
-- Discover: hard filters are applied here, BEFORE any scoring.
-- Scoring (explainable, configurable) happens in the application layer.
-- ---------------------------------------------------------------------------
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
    (p.verification = 'verified'),
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
    and u.email_confirmed_at is not null
    -- mutual gender preferences
    and p.gender = any (my_pref.interested_in)
    and me.gender = any (cp.interested_in)
    -- mutual age preferences
    and private.age_years(p.birth_date) between my_pref.age_min and my_pref.age_max
    and my_age between cp.age_min and cp.age_max
    -- mutual relationship goal filters (empty = open to all)
    and (cardinality(my_pref.goals) = 0 or p.relationship_goal = any (my_pref.goals))
    and (cardinality(cp.goals) = 0 or me.relationship_goal = any (cp.goals))
    -- availability
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
-- Like / Pass / Mutual match
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

  perform private.lock_users(v_uid, p_target);

  if private.active_connection_id(v_uid) is not null then
    perform private.raise_error('exclusive_connection_active');
  end if;
  if not private.is_available(p_target)
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
      -- The liker's identity is visible on the Likes page, not in the notification.
      perform private.notify(p_target, 'like_received', '{}'::jsonb);
    end if;
  end if;
  return jsonb_build_object('status', 'liked');
end;
$$;

create or replace function public.pass_profile(p_target uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.require_available_user();
begin
  if p_target is null or p_target = v_uid then
    perform private.raise_error('invalid_target');
  end if;
  insert into public.passes (from_user, to_user) values (v_uid, p_target) on conflict do nothing;
end;
$$;

create or replace function public.get_received_likes()
returns table (user_id uuid, liked_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select l.from_user, l.created_at
  from public.likes l
  where l.to_user = (select auth.uid())
    and private.is_available(l.from_user)
    and not private.is_blocked_between(l.from_user, l.to_user)
    and not exists (select 1 from public.likes back where back.from_user = l.to_user and back.to_user = l.from_user)
    and not exists (select 1 from public.passes ps where ps.from_user = l.to_user and ps.to_user = l.from_user)
  order by l.created_at desc
  limit 200;
$$;

create or replace function public.get_my_matches()
returns table (
  match_id uuid,
  partner_id uuid,
  match_status public.match_status,
  matched_at timestamptz,
  partner_available boolean,
  partner_subscribed boolean,
  partner_in_connection boolean,
  connection_id uuid,
  connection_status public.connection_status
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    m.id,
    case when m.user_low = (select auth.uid()) then m.user_high else m.user_low end as partner,
    m.status,
    m.created_at,
    private.is_available(case when m.user_low = (select auth.uid()) then m.user_high else m.user_low end),
    private.has_active_subscription(case when m.user_low = (select auth.uid()) then m.user_high else m.user_low end),
    private.active_connection_id(case when m.user_low = (select auth.uid()) then m.user_high else m.user_low end) is not null,
    c.id,
    c.status
  from public.matches m
  left join public.connections c on c.match_id = m.id
  where (select auth.uid()) in (m.user_low, m.user_high)
    and not private.is_blocked_between(m.user_low, m.user_high)
  order by m.created_at desc;
$$;

-- ---------------------------------------------------------------------------
-- Exclusive connection lifecycle
-- ---------------------------------------------------------------------------
create or replace function private.close_connection(
  p_connection uuid,
  p_reason public.connection_end_reason,
  p_ended_by uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  c public.connections;
begin
  update public.connections
  set status = 'closed', ended_at = now(), ended_by = p_ended_by, end_reason = p_reason
  where id = p_connection and status = 'active'
  returning * into c;

  if not found then
    return false; -- already closed: idempotent no-op
  end if;

  update public.connection_participants set is_active = false where connection_id = p_connection;
  update public.matches set status = 'closed', closed_at = now() where id = c.match_id;

  update public.booking_requests br set status = 'cancelled'
  from public.date_plans dp
  where dp.id = br.date_plan_id and dp.connection_id = p_connection and br.status = 'requested';
  update public.date_plans set status = 'cancelled' where connection_id = p_connection and status <> 'cancelled';

  if c.user_low is not null then
    perform private.notify(c.user_low, 'connection_ended',
      jsonb_build_object('connection_id', p_connection, 'reason', p_reason, 'by_me', c.user_low = p_ended_by));
  end if;
  if c.user_high is not null then
    perform private.notify(c.user_high, 'connection_ended',
      jsonb_build_object('connection_id', p_connection, 'reason', p_reason, 'by_me', c.user_high = p_ended_by));
  end if;
  return true;
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

  -- Re-read under lock.
  select * into m from public.matches where id = p_match_id;
  if m.status <> 'active' or exists (select 1 from public.connections where match_id = m.id) then
    perform private.raise_error('match_closed');
  end if;
  if not private.is_available(v_partner) or private.is_blocked_between(v_uid, v_partner) then
    perform private.raise_error('partner_unavailable');
  end if;
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

  -- The partial unique index is a second line of defence against races.
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

create or replace function public.end_connection(p_connection uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.require_user();
begin
  if not private.is_connection_member(p_connection, v_uid) then
    perform private.raise_error('not_participant');
  end if;
  return private.close_connection(p_connection, 'manual', v_uid);
end;
$$;

create or replace function public.get_active_connection()
returns table (
  connection_id uuid,
  match_id uuid,
  partner_id uuid,
  started_at timestamptz,
  started_by uuid,
  pending_sender uuid,
  pending_since timestamptz,
  deadline timestamptz,
  me_subscribed boolean,
  partner_subscribed boolean,
  partner_last_read_at timestamptz,
  my_last_read_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    c.id, c.match_id,
    case when c.user_low = (select auth.uid()) then c.user_high else c.user_low end,
    c.started_at, c.started_by, c.pending_sender, c.pending_since,
    c.pending_since + make_interval(hours => private.config_int('inactivity_timeout_hours', 72)),
    private.has_active_subscription((select auth.uid())),
    private.has_active_subscription(case when c.user_low = (select auth.uid()) then c.user_high else c.user_low end),
    (select last_read_at from public.connection_participants
      where connection_id = c.id and user_id <> (select auth.uid()) limit 1),
    (select last_read_at from public.connection_participants
      where connection_id = c.id and user_id = (select auth.uid()))
  from public.connection_participants me
  join public.connections c on c.id = me.connection_id
  where me.user_id = (select auth.uid()) and me.is_active and c.status = 'active';
$$;

-- ---------------------------------------------------------------------------
-- Chat
-- ---------------------------------------------------------------------------
create or replace function public.send_message(p_connection uuid, p_body text, p_client_id uuid)
returns public.messages
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.require_user();
  c public.connections;
  v_partner uuid;
  v_body text := btrim(coalesce(p_body, ''));
  v_msg public.messages;
begin
  if p_client_id is null then
    perform private.raise_error('invalid_message');
  end if;
  if char_length(v_body) < 1 or char_length(v_body) > 2000 then
    perform private.raise_error('invalid_message');
  end if;

  -- Lock the connection row: serialises concurrent sends so the timer is consistent.
  select * into c from public.connections where id = p_connection for update;
  if not found or not private.is_connection_member(p_connection, v_uid) then
    perform private.raise_error('not_participant');
  end if;

  -- Idempotent retry: same client_id returns the already stored message.
  select * into v_msg from public.messages where sender_id = v_uid and client_id = p_client_id;
  if found then
    return v_msg;
  end if;

  if c.status <> 'active' then
    perform private.raise_error('connection_closed');
  end if;
  if exists (select 1 from public.profiles where id = v_uid and (suspended_at is not null or deleted_at is not null)) then
    perform private.raise_error('account_suspended');
  end if;
  v_partner := case when c.user_low = v_uid then c.user_high else c.user_low end;
  if not private.has_active_subscription(v_uid) then
    perform private.raise_error('subscription_required');
  end if;
  if v_partner is null or not private.has_active_subscription(v_partner) then
    perform private.raise_error('partner_subscription_inactive');
  end if;

  perform private.enforce_rate_limit(v_uid, 'message', private.config_int('messages_per_minute_limit', 30), interval '1 minute');

  insert into public.messages (connection_id, sender_id, body, client_id)
  values (p_connection, v_uid, v_body, p_client_id)
  returning * into v_msg;

  -- 72h timer rules:
  --  * a message from the other side (a real reply) ends the previous timer and
  --    starts a new one for the person who now has to answer;
  --  * consecutive messages from the same sender do NOT restart the timer.
  if c.pending_sender is distinct from v_uid then
    update public.connections
    set pending_sender = v_uid, pending_since = v_msg.created_at, reminder_sent_at = null,
        last_message_at = v_msg.created_at
    where id = p_connection;
  else
    update public.connections set last_message_at = v_msg.created_at where id = p_connection;
  end if;

  update public.connection_participants set last_read_at = v_msg.created_at
  where connection_id = p_connection and user_id = v_uid;

  -- One unread "new message" notification per conversation is enough.
  if not exists (
    select 1 from public.notifications
    where user_id = v_partner and type = 'new_message' and read_at is null
      and data ->> 'connection_id' = p_connection::text
  ) then
    perform private.notify(v_partner, 'new_message', jsonb_build_object('connection_id', p_connection));
  end if;

  return v_msg;
end;
$$;

create or replace function public.mark_connection_read(p_connection uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.require_user();
begin
  update public.connection_participants set last_read_at = now()
  where connection_id = p_connection and user_id = v_uid;
  update public.notifications set read_at = now()
  where user_id = v_uid and type = 'new_message' and read_at is null
    and data ->> 'connection_id' = p_connection::text;
end;
$$;

-- ---------------------------------------------------------------------------
-- 72-hour inactivity timeout (run by pg_cron; idempotent, concurrency-safe)
-- ---------------------------------------------------------------------------
create or replace function private.process_connection_timeouts()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_timeout interval := make_interval(hours => private.config_int('inactivity_timeout_hours', 72));
  v_reminder interval := make_interval(hours => private.config_int('inactivity_reminder_hours', 48));
  r record;
  v_reminders integer := 0;
  v_closed integer := 0;
begin
  -- Reminders (sent once per timer).
  for r in
    select id, user_low, user_high, pending_sender, pending_since
    from public.connections
    where status = 'active'
      and reminder_sent_at is null
      and pending_since <= now() - v_reminder
      and pending_since > now() - v_timeout
    for update skip locked
  loop
    update public.connections set reminder_sent_at = now() where id = r.id;
    if r.pending_sender is null then
      perform private.notify(r.user_low, 'inactivity_reminder',
        jsonb_build_object('connection_id', r.id, 'deadline', r.pending_since + v_timeout, 'awaiting', 'anyone'));
      perform private.notify(r.user_high, 'inactivity_reminder',
        jsonb_build_object('connection_id', r.id, 'deadline', r.pending_since + v_timeout, 'awaiting', 'anyone'));
    else
      -- The person who has to reply.
      perform private.notify(
        case when r.pending_sender = r.user_low then r.user_high else r.user_low end,
        'inactivity_reminder',
        jsonb_build_object('connection_id', r.id, 'deadline', r.pending_since + v_timeout, 'awaiting', 'you'));
      perform private.notify(r.pending_sender, 'inactivity_reminder',
        jsonb_build_object('connection_id', r.id, 'deadline', r.pending_since + v_timeout, 'awaiting', 'partner'));
    end if;
    v_reminders := v_reminders + 1;
  end loop;

  -- Timeouts.
  for r in
    select id from public.connections
    where status = 'active' and pending_since <= now() - v_timeout
    for update skip locked
  loop
    if private.close_connection(r.id, 'timeout', null) then
      v_closed := v_closed + 1;
    end if;
  end loop;

  return jsonb_build_object('reminders', v_reminders, 'closed', v_closed);
end;
$$;

-- ---------------------------------------------------------------------------
-- Safety: block & report (always allowed, even without subscription)
-- ---------------------------------------------------------------------------
create or replace function public.block_user(p_target uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.require_user();
  v_connection uuid;
begin
  if p_target is null or p_target = v_uid then
    perform private.raise_error('invalid_target');
  end if;
  perform private.lock_users(v_uid, p_target);
  insert into public.blocks (blocker_id, blocked_id) values (v_uid, p_target) on conflict do nothing;

  select cp.connection_id into v_connection
  from public.connection_participants cp
  join public.connection_participants other
    on other.connection_id = cp.connection_id and other.user_id = p_target and other.is_active
  where cp.user_id = v_uid and cp.is_active;
  if v_connection is not null then
    perform private.close_connection(v_connection, 'block', v_uid);
  end if;

  update public.matches set status = 'closed', closed_at = coalesce(closed_at, now())
  where user_low = least(v_uid, p_target) and user_high = greatest(v_uid, p_target) and status = 'active';
end;
$$;

create or replace function public.unblock_user(p_target uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.blocks where blocker_id = (select auth.uid()) and blocked_id = p_target;
$$;

create or replace function public.report_user(
  p_target uuid,
  p_reason public.report_reason,
  p_details text default null,
  p_message_id uuid default null,
  p_block boolean default false
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.require_user();
  v_report uuid;
  v_snapshot text;
  v_connection uuid;
begin
  if p_target is null or p_target = v_uid then
    perform private.raise_error('invalid_target');
  end if;
  perform private.enforce_rate_limit(v_uid, 'report', 20, interval '24 hours');

  if p_message_id is not null then
    select m.body, m.connection_id into v_snapshot, v_connection
    from public.messages m
    where m.id = p_message_id
      and m.sender_id = p_target
      and private.is_connection_member(m.connection_id, v_uid);
    if v_snapshot is null then
      perform private.raise_error('invalid_message');
    end if;
  else
    select cp.connection_id into v_connection
    from public.connection_participants cp
    join public.connection_participants other on other.connection_id = cp.connection_id and other.user_id = p_target
    where cp.user_id = v_uid
    order by cp.is_active desc
    limit 1;
  end if;

  insert into public.reports (reporter_id, reported_user_id, connection_id, message_id, message_snapshot, reason, details)
  values (v_uid, p_target, v_connection, p_message_id, v_snapshot, p_reason, left(p_details, 1000))
  returning id into v_report;

  -- Reporting always releases the reporter from an active connection with that user.
  if v_connection is not null and exists (
       select 1 from public.connections where id = v_connection and status = 'active') then
    perform private.close_connection(v_connection, 'report', v_uid);
  end if;

  if p_block then
    perform public.block_user(p_target);
  end if;
  return v_report;
end;
$$;

-- ---------------------------------------------------------------------------
-- First Date
-- ---------------------------------------------------------------------------
create or replace function private.require_active_connection_member(p_connection uuid)
returns public.connections
language plpgsql
security definer
set search_path = ''
as $$
declare
  c public.connections;
begin
  select * into c from public.connections where id = p_connection for update;
  if not found or not private.is_connection_member(p_connection, auth.uid()) then
    perform private.raise_error('not_participant');
  end if;
  if c.status <> 'active' then
    perform private.raise_error('connection_closed');
  end if;
  return c;
end;
$$;

create or replace function public.first_date_opt_in(p_connection uuid)
returns public.date_plans
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.require_user();
  c public.connections := private.require_active_connection_member(p_connection);
  dp public.date_plans;
  v_partner uuid;
begin
  v_partner := case when c.user_low = v_uid then c.user_high else c.user_low end;
  insert into public.date_plans (connection_id) values (p_connection) on conflict (connection_id) do nothing;
  select * into dp from public.date_plans where connection_id = p_connection for update;
  if dp.status = 'cancelled' then
    update public.date_plans
    set status = 'opt_in', low_opted_in_at = null, high_opted_in_at = null, venue_id = null,
        scheduled_for = null, proposed_by = null, low_confirmed_at = null, high_confirmed_at = null
    where id = dp.id returning * into dp;
  end if;

  if v_uid = c.user_low then
    update public.date_plans set low_opted_in_at = coalesce(low_opted_in_at, now()) where id = dp.id returning * into dp;
  else
    update public.date_plans set high_opted_in_at = coalesce(high_opted_in_at, now()) where id = dp.id returning * into dp;
  end if;

  if dp.status = 'opt_in' and dp.low_opted_in_at is not null and dp.high_opted_in_at is not null then
    update public.date_plans set status = 'planning' where id = dp.id returning * into dp;
    perform private.notify(c.user_low, 'first_date_update', jsonb_build_object('connection_id', p_connection, 'event', 'unlocked'));
    perform private.notify(c.user_high, 'first_date_update', jsonb_build_object('connection_id', p_connection, 'event', 'unlocked'));
  elsif dp.status = 'opt_in' then
    perform private.notify(v_partner, 'first_date_update', jsonb_build_object('connection_id', p_connection, 'event', 'invited'));
  end if;
  return dp;
end;
$$;

create or replace function public.first_date_propose(p_connection uuid, p_venue uuid, p_scheduled_for timestamptz)
returns public.date_plans
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.require_user();
  c public.connections := private.require_active_connection_member(p_connection);
  dp public.date_plans;
begin
  select * into dp from public.date_plans where connection_id = p_connection for update;
  if not found or dp.status not in ('planning', 'confirmed') then
    perform private.raise_error('first_date_not_unlocked');
  end if;
  if not exists (select 1 from public.venues where id = p_venue and is_active) then
    perform private.raise_error('venue_unavailable');
  end if;
  if p_scheduled_for is null or p_scheduled_for < now() + interval '2 hours'
     or p_scheduled_for > now() + interval '60 days' then
    perform private.raise_error('invalid_date_time');
  end if;

  -- A new proposal replaces any previous one and needs both confirmations again.
  update public.booking_requests set status = 'cancelled' where date_plan_id = dp.id and status = 'requested';
  update public.date_plans
  set status = 'planning', venue_id = p_venue, scheduled_for = p_scheduled_for, proposed_by = v_uid,
      low_confirmed_at = case when v_uid = c.user_low then now() end,
      high_confirmed_at = case when v_uid = c.user_high then now() end
  where id = dp.id
  returning * into dp;

  perform private.notify(case when c.user_low = v_uid then c.user_high else c.user_low end,
    'first_date_update', jsonb_build_object('connection_id', p_connection, 'event', 'proposed'));
  return dp;
end;
$$;

create or replace function public.first_date_confirm(p_connection uuid)
returns public.date_plans
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.require_user();
  c public.connections := private.require_active_connection_member(p_connection);
  dp public.date_plans;
  v_mode public.booking_mode;
begin
  select * into dp from public.date_plans where connection_id = p_connection for update;
  if not found or dp.status <> 'planning' or dp.venue_id is null or dp.scheduled_for is null then
    perform private.raise_error('no_proposal');
  end if;
  if dp.scheduled_for < now() then
    perform private.raise_error('invalid_date_time');
  end if;

  if v_uid = c.user_low then
    update public.date_plans set low_confirmed_at = coalesce(low_confirmed_at, now()) where id = dp.id returning * into dp;
  else
    update public.date_plans set high_confirmed_at = coalesce(high_confirmed_at, now()) where id = dp.id returning * into dp;
  end if;

  if dp.low_confirmed_at is not null and dp.high_confirmed_at is not null then
    update public.date_plans set status = 'confirmed' where id = dp.id returning * into dp;
    select booking_mode into v_mode from public.venues where id = dp.venue_id;
    if v_mode = 'request' then
      -- A booking is only a REQUEST until the venue/admin confirms it.
      insert into public.booking_requests (date_plan_id, venue_id, requested_for)
      values (dp.id, dp.venue_id, dp.scheduled_for);
    end if;
    perform private.notify(c.user_low, 'first_date_update', jsonb_build_object('connection_id', p_connection, 'event', 'confirmed'));
    perform private.notify(c.user_high, 'first_date_update', jsonb_build_object('connection_id', p_connection, 'event', 'confirmed'));
  end if;
  return dp;
end;
$$;

create or replace function public.first_date_cancel(p_connection uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.require_user();
  c public.connections := private.require_active_connection_member(p_connection);
  dp public.date_plans;
begin
  select * into dp from public.date_plans where connection_id = p_connection for update;
  if not found then
    return;
  end if;
  update public.booking_requests set status = 'cancelled' where date_plan_id = dp.id and status = 'requested';
  update public.date_plans
  set status = 'planning', venue_id = null, scheduled_for = null, proposed_by = null,
      low_confirmed_at = null, high_confirmed_at = null
  where id = dp.id and status in ('planning', 'confirmed');
  perform private.notify(case when c.user_low = v_uid then c.user_high else c.user_low end,
    'first_date_update', jsonb_build_object('connection_id', p_connection, 'event', 'cancelled'));
end;
$$;

-- ---------------------------------------------------------------------------
-- Profile verification (selfie reviewed by a human moderator)
-- ---------------------------------------------------------------------------
create or replace function public.request_verification(p_storage_path text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.require_user();
  v_id uuid;
begin
  if split_part(p_storage_path, '/', 1) <> v_uid::text then
    perform private.raise_error('invalid_photo_path');
  end if;
  if exists (select 1 from public.profiles where id = v_uid and verification = 'verified') then
    perform private.raise_error('already_verified');
  end if;
  insert into public.verification_requests (user_id, storage_path) values (v_uid, p_storage_path)
  on conflict (user_id) where status = 'pending' do update set storage_path = excluded.storage_path, created_at = now()
  returning id into v_id;
  update public.profiles set verification = 'pending' where id = v_uid;
  return v_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- GDPR: account deletion preparation (the auth user is then deleted
-- server-side with the service role, cascading to all personal data).
-- ---------------------------------------------------------------------------
create or replace function public.prepare_account_deletion()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.require_user();
  v_connection uuid := private.active_connection_id(v_uid);
begin
  if v_connection is not null then
    perform private.close_connection(v_connection, 'account_deleted', v_uid);
  end if;
  update public.profiles set deleted_at = now(), is_hidden = true where id = v_uid;
end;
$$;

-- ---------------------------------------------------------------------------
-- Data retention (run daily by pg_cron)
-- ---------------------------------------------------------------------------
create or replace function private.purge_expired_data()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_messages integer;
  v_notifications integer;
begin
  delete from public.messages m
  using public.connections c
  where m.connection_id = c.id
    and c.status = 'closed'
    and c.ended_at < now() - make_interval(days => private.config_int('closed_chat_retention_days', 90));
  get diagnostics v_messages = row_count;

  delete from public.notifications
  where created_at < now() - make_interval(days => private.config_int('notification_retention_days', 180));
  get diagnostics v_notifications = row_count;

  delete from private.rate_limit_events where created_at < now() - interval '2 days';
  delete from public.stripe_events where received_at < now() - interval '90 days';

  return jsonb_build_object('messages', v_messages, 'notifications', v_notifications);
end;
$$;

-- ---------------------------------------------------------------------------
-- Privileges for RPCs
-- ---------------------------------------------------------------------------
revoke execute on all functions in schema private from public, anon, authenticated;
grant execute on function private.is_connection_member(uuid, uuid) to authenticated;
grant execute on function private.can_view_profile(uuid, uuid) to authenticated;
grant execute on function private.age_years(date) to authenticated;
grant execute on function private.raise_error(text) to authenticated;

do $$
declare
  f text;
begin
  foreach f in array array[
    'public.complete_onboarding()',
    'public.get_discover_candidates(integer)',
    'public.like_profile(uuid)',
    'public.pass_profile(uuid)',
    'public.get_received_likes()',
    'public.get_my_matches()',
    'public.start_connection(uuid)',
    'public.end_connection(uuid)',
    'public.get_active_connection()',
    'public.send_message(uuid, text, uuid)',
    'public.mark_connection_read(uuid)',
    'public.block_user(uuid)',
    'public.unblock_user(uuid)',
    'public.report_user(uuid, public.report_reason, text, uuid, boolean)',
    'public.first_date_opt_in(uuid)',
    'public.first_date_propose(uuid, uuid, timestamptz)',
    'public.first_date_confirm(uuid)',
    'public.first_date_cancel(uuid)',
    'public.request_verification(text)',
    'public.prepare_account_deletion()'
  ] loop
    execute format('revoke execute on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end;
$$;
