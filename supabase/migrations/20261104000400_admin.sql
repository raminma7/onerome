-- OneRome — admin & moderation RPCs
-- Every privileged action is checked with private.is_admin() and written to
-- admin_audit_log. Private message content is never listed: reported evidence
-- is only readable through an explicit, audited call.

create or replace function private.require_admin()
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null or not private.is_admin(v_uid) then
    perform private.raise_error('forbidden');
  end if;
  return v_uid;
end;
$$;

create or replace function private.audit(p_admin uuid, p_action text, p_target_type text, p_target_id text, p_metadata jsonb default '{}')
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.admin_audit_log (admin_id, action, target_type, target_id, metadata)
  values (p_admin, p_action, p_target_type, p_target_id, coalesce(p_metadata, '{}'));
$$;

create or replace function public.admin_stats()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.require_admin();
  return jsonb_build_object(
    'users_total', (select count(*) from public.profiles where deleted_at is null),
    'users_onboarded', (select count(*) from public.profiles where onboarding_completed_at is not null and deleted_at is null),
    'users_active_7d', (select count(*) from public.profiles where last_active_at > now() - interval '7 days' and deleted_at is null),
    'users_suspended', (select count(*) from public.profiles where suspended_at is not null),
    'likes_24h', (select count(*) from public.likes where created_at > now() - interval '24 hours'),
    'matches_total', (select count(*) from public.matches),
    'connections_active', (select count(*) from public.connections where status = 'active'),
    'connections_timeout_30d', (select count(*) from public.connections where end_reason = 'timeout' and ended_at > now() - interval '30 days'),
    'subscriptions_active', (select count(distinct user_id) from public.subscriptions where status in ('active', 'trialing') and (current_period_end is null or current_period_end > now())),
    'reports_open', (select count(*) from public.reports where status in ('open', 'reviewing')),
    'verifications_pending', (select count(*) from public.verification_requests where status = 'pending'),
    'bookings_pending', (select count(*) from public.booking_requests where status = 'requested'),
    'dates_confirmed_30d', (select count(*) from public.date_plans where status = 'confirmed' and updated_at > now() - interval '30 days')
  );
end;
$$;

create or replace function public.admin_search_users(
  p_query text default null,
  p_filter text default 'all',
  p_limit integer default 50,
  p_offset integer default 0
)
returns table (
  id uuid,
  email text,
  display_name text,
  age integer,
  neighborhood text,
  role public.user_role,
  verification public.verification_status,
  onboarding_completed_at timestamptz,
  suspended_at timestamptz,
  suspension_reason text,
  created_at timestamptz,
  last_active_at timestamptz,
  subscription_status public.subscription_status,
  reports_against bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform private.require_admin();
  return query
  select
    p.id, u.email::text, p.display_name, private.age_years(p.birth_date), p.neighborhood, p.role,
    p.verification, p.onboarding_completed_at, p.suspended_at, p.suspension_reason, p.created_at,
    p.last_active_at,
    (select s.status from public.subscriptions s where s.user_id = p.id order by s.updated_at desc limit 1),
    (select count(*) from public.reports r where r.reported_user_id = p.id)
  from public.profiles p
  join auth.users u on u.id = p.id
  where p.deleted_at is null
    and (p_query is null or p_query = ''
         or p.display_name ilike '%' || p_query || '%'
         or u.email ilike '%' || p_query || '%'
         or p.id::text = p_query)
    and (
      p_filter = 'all'
      or (p_filter = 'suspended' and p.suspended_at is not null)
      or (p_filter = 'reported' and exists (select 1 from public.reports r where r.reported_user_id = p.id and r.status in ('open', 'reviewing')))
      or (p_filter = 'verification_pending' and p.verification = 'pending')
    )
  order by p.created_at desc
  limit least(greatest(coalesce(p_limit, 50), 1), 200)
  offset greatest(coalesce(p_offset, 0), 0);
end;
$$;

create or replace function public.admin_set_suspension(p_user uuid, p_suspend boolean, p_reason text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin uuid := private.require_admin();
  v_connection uuid;
begin
  if p_user = v_admin then
    perform private.raise_error('invalid_target');
  end if;
  if p_suspend then
    update public.profiles set suspended_at = now(), suspension_reason = left(p_reason, 500) where id = p_user;
    v_connection := private.active_connection_id(p_user);
    if v_connection is not null then
      perform private.close_connection(v_connection, 'admin', null);
    end if;
  else
    update public.profiles set suspended_at = null, suspension_reason = null where id = p_user;
  end if;
  perform private.audit(v_admin, case when p_suspend then 'suspend_user' else 'unsuspend_user' end,
    'user', p_user::text, jsonb_build_object('reason', p_reason));
end;
$$;

create or replace function public.admin_list_reports(p_status public.report_status default null, p_limit integer default 100)
returns table (
  id uuid,
  reporter_id uuid,
  reporter_name text,
  reported_user_id uuid,
  reported_name text,
  reason public.report_reason,
  details text,
  has_message_evidence boolean,
  status public.report_status,
  resolution_note text,
  created_at timestamptz,
  resolved_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform private.require_admin();
  return query
  select r.id, r.reporter_id, rp.display_name, r.reported_user_id, tp.display_name, r.reason, r.details,
         r.message_snapshot is not null, r.status, r.resolution_note, r.created_at, r.resolved_at
  from public.reports r
  left join public.profiles rp on rp.id = r.reporter_id
  left join public.profiles tp on tp.id = r.reported_user_id
  where p_status is null or r.status = p_status
  order by r.created_at desc
  limit least(greatest(coalesce(p_limit, 100), 1), 500);
end;
$$;

-- Audited access to the reported message (and nothing else from the chat).
create or replace function public.admin_get_report_evidence(p_report uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin uuid := private.require_admin();
  r public.reports;
begin
  select * into r from public.reports where id = p_report;
  if not found then
    perform private.raise_error('not_found');
  end if;
  perform private.audit(v_admin, 'view_report_evidence', 'report', p_report::text, '{}');
  if r.status = 'open' then
    update public.reports set status = 'reviewing' where id = p_report;
  end if;
  return jsonb_build_object('message', r.message_snapshot, 'message_id', r.message_id);
end;
$$;

create or replace function public.admin_resolve_report(p_report uuid, p_status public.report_status, p_note text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin uuid := private.require_admin();
begin
  if p_status not in ('actioned', 'dismissed', 'reviewing') then
    perform private.raise_error('invalid_status');
  end if;
  update public.reports
  set status = p_status, resolution_note = left(p_note, 1000),
      resolved_by = case when p_status = 'reviewing' then null else v_admin end,
      resolved_at = case when p_status = 'reviewing' then null else now() end
  where id = p_report;
  perform private.audit(v_admin, 'resolve_report', 'report', p_report::text, jsonb_build_object('status', p_status));
end;
$$;

create or replace function public.admin_review_verification(p_request uuid, p_approve boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin uuid := private.require_admin();
  v_user uuid;
  v_status public.verification_status := case when p_approve then 'verified' else 'rejected' end;
begin
  update public.verification_requests
  set status = v_status, reviewed_by = v_admin, reviewed_at = now()
  where id = p_request and status = 'pending'
  returning user_id into v_user;
  if v_user is null then
    perform private.raise_error('not_found');
  end if;
  update public.profiles set verification = v_status where id = v_user;
  perform private.notify(v_user, 'verification_status', jsonb_build_object('status', v_status));
  perform private.audit(v_admin, 'review_verification', 'user', v_user::text, jsonb_build_object('approved', p_approve));
end;
$$;

create or replace function public.admin_list_verifications()
returns table (id uuid, user_id uuid, display_name text, storage_path text, created_at timestamptz)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform private.require_admin();
  return query
  select v.id, v.user_id, p.display_name, v.storage_path, v.created_at
  from public.verification_requests v
  join public.profiles p on p.id = v.user_id
  where v.status = 'pending'
  order by v.created_at;
end;
$$;

create or replace function public.admin_update_booking(p_booking uuid, p_status public.booking_status, p_note text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin uuid := private.require_admin();
  v_connection uuid;
  c public.connections;
begin
  update public.booking_requests br
  set status = p_status, admin_note = left(p_note, 500)
  where br.id = p_booking
  returning (select dp.connection_id from public.date_plans dp where dp.id = br.date_plan_id) into v_connection;
  if v_connection is null then
    perform private.raise_error('not_found');
  end if;
  select * into c from public.connections where id = v_connection;
  if c.user_low is not null then
    perform private.notify(c.user_low, 'booking_status', jsonb_build_object('connection_id', v_connection, 'status', p_status));
  end if;
  if c.user_high is not null then
    perform private.notify(c.user_high, 'booking_status', jsonb_build_object('connection_id', v_connection, 'status', p_status));
  end if;
  perform private.audit(v_admin, 'update_booking', 'booking', p_booking::text, jsonb_build_object('status', p_status));
end;
$$;

create or replace function public.admin_list_bookings(p_status public.booking_status default null)
returns table (
  id uuid,
  venue_id uuid,
  venue_name text,
  requested_for timestamptz,
  party_size smallint,
  status public.booking_status,
  admin_note text,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform private.require_admin();
  -- Participants' identities are not needed to handle a table booking.
  return query
  select b.id, b.venue_id, v.name, b.requested_for, b.party_size, b.status, b.admin_note, b.created_at
  from public.booking_requests b
  join public.venues v on v.id = b.venue_id
  where p_status is null or b.status = p_status
  order by b.requested_for;
end;
$$;

create or replace function public.admin_list_subscriptions(p_limit integer default 200)
returns table (
  id text,
  user_id uuid,
  display_name text,
  status public.subscription_status,
  cancel_at_period_end boolean,
  current_period_end timestamptz,
  updated_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform private.require_admin();
  return query
  select s.id, s.user_id, p.display_name, s.status, s.cancel_at_period_end, s.current_period_end, s.updated_at
  from public.subscriptions s
  join public.profiles p on p.id = s.user_id
  order by s.updated_at desc
  limit least(greatest(coalesce(p_limit, 200), 1), 1000);
end;
$$;

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
    'public.admin_stats()',
    'public.admin_search_users(text, text, integer, integer)',
    'public.admin_set_suspension(uuid, boolean, text)',
    'public.admin_list_reports(public.report_status, integer)',
    'public.admin_get_report_evidence(uuid)',
    'public.admin_resolve_report(uuid, public.report_status, text)',
    'public.admin_review_verification(uuid, boolean)',
    'public.admin_list_verifications()',
    'public.admin_update_booking(uuid, public.booking_status, text)',
    'public.admin_list_bookings(public.booking_status)',
    'public.admin_list_subscriptions(integer)'
  ] loop
    execute format('revoke execute on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end;
$$;
