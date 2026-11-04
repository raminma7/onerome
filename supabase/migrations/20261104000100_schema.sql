-- OneRome — core schema
-- Tables, enums, indexes and reference data. Security (RLS, grants) lives in
-- the next migration; business logic (RPCs) in the one after.

create schema if not exists private;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type public.gender as enum ('woman', 'man', 'non_binary');
create type public.relationship_goal as enum ('long_term', 'marriage', 'open', 'figuring_out');
create type public.app_locale as enum ('it', 'en');
create type public.user_role as enum ('user', 'admin');
create type public.verification_status as enum ('unverified', 'pending', 'verified', 'rejected');
create type public.match_status as enum ('active', 'closed');
create type public.connection_status as enum ('active', 'closed');
create type public.connection_end_reason as enum (
  'manual', 'timeout', 'block', 'report', 'account_deleted', 'admin'
);
create type public.subscription_status as enum (
  'incomplete', 'incomplete_expired', 'trialing', 'active', 'past_due', 'canceled', 'unpaid', 'paused'
);
create type public.notification_type as enum (
  'like_received',
  'mutual_match',
  'connection_started',
  'new_message',
  'inactivity_reminder',
  'connection_ended',
  'first_date_update',
  'booking_status',
  'subscription_status',
  'verification_status'
);
create type public.report_reason as enum (
  'spam', 'fake_profile', 'harassment', 'inappropriate_content', 'underage', 'scam', 'other'
);
create type public.report_status as enum ('open', 'reviewing', 'actioned', 'dismissed');
create type public.venue_category as enum (
  'cafe', 'restaurant', 'wine_bar', 'gelateria', 'culture', 'park', 'experience'
);
create type public.booking_mode as enum ('none', 'request');
create type public.date_plan_status as enum ('opt_in', 'planning', 'confirmed', 'cancelled');
create type public.booking_status as enum ('requested', 'confirmed', 'declined', 'cancelled');
create type public.consent_kind as enum ('terms', 'privacy', 'sensitive_data', 'marketing');

-- ---------------------------------------------------------------------------
-- Configuration (tunable without code changes)
-- ---------------------------------------------------------------------------
create table public.app_config (
  key text primary key,
  value jsonb not null,
  description text,
  updated_at timestamptz not null default now()
);

insert into public.app_config (key, value, description) values
  ('inactivity_timeout_hours', '72', 'Hours without a reply before an exclusive connection closes automatically'),
  ('inactivity_reminder_hours', '48', 'Hours without a reply before a reminder notification is sent'),
  ('closed_chat_retention_days', '90', 'Days messages of a closed connection are kept before being purged'),
  ('notification_retention_days', '180', 'Days notifications are kept'),
  ('daily_like_limit', '150', 'Maximum likes per user per 24h (anti-spam)'),
  ('messages_per_minute_limit', '30', 'Maximum messages per user per minute (anti-spam)'),
  ('max_profile_photos', '6', 'Maximum number of profile photos');

-- ---------------------------------------------------------------------------
-- Reference data: neighbourhoods of Rome (public, coarse location only)
-- ---------------------------------------------------------------------------
create table public.neighborhoods (
  slug text primary key,
  name text not null,
  zone text not null check (zone in ('centro', 'nord', 'est', 'sud', 'ovest', 'litorale'))
);

insert into public.neighborhoods (slug, name, zone) values
  ('centro-storico', 'Centro Storico', 'centro'),
  ('monti', 'Monti', 'centro'),
  ('trastevere', 'Trastevere', 'centro'),
  ('testaccio', 'Testaccio', 'centro'),
  ('esquilino', 'Esquilino', 'centro'),
  ('aventino', 'Aventino', 'centro'),
  ('prati', 'Prati', 'centro'),
  ('san-lorenzo', 'San Lorenzo', 'centro'),
  ('celio', 'Celio', 'centro'),
  ('flaminio', 'Flaminio', 'nord'),
  ('parioli', 'Parioli', 'nord'),
  ('pinciano', 'Pinciano', 'nord'),
  ('trieste', 'Trieste', 'nord'),
  ('salario', 'Salario', 'nord'),
  ('nomentano', 'Nomentano', 'nord'),
  ('montesacro', 'Montesacro', 'nord'),
  ('talenti', 'Talenti', 'nord'),
  ('vigna-clara', 'Vigna Clara', 'nord'),
  ('ponte-milvio', 'Ponte Milvio', 'nord'),
  ('balduina', 'Balduina', 'nord'),
  ('monte-mario', 'Monte Mario', 'nord'),
  ('pigneto', 'Pigneto', 'est'),
  ('tiburtino', 'Tiburtino', 'est'),
  ('prenestino', 'Prenestino', 'est'),
  ('centocelle', 'Centocelle', 'est'),
  ('torpignattara', 'Torpignattara', 'est'),
  ('tuscolano', 'Tuscolano', 'est'),
  ('san-giovanni', 'San Giovanni', 'sud'),
  ('appio-latino', 'Appio Latino', 'sud'),
  ('garbatella', 'Garbatella', 'sud'),
  ('ostiense', 'Ostiense', 'sud'),
  ('eur', 'EUR', 'sud'),
  ('ardeatino', 'Ardeatino', 'sud'),
  ('monteverde', 'Monteverde', 'ovest'),
  ('portuense', 'Portuense', 'ovest'),
  ('aurelio', 'Aurelio', 'ovest'),
  ('trionfale', 'Trionfale', 'ovest'),
  ('primavalle', 'Primavalle', 'ovest'),
  ('ostia', 'Ostia', 'litorale');

-- ---------------------------------------------------------------------------
-- Users
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text check (char_length(btrim(display_name)) between 2 and 40),
  birth_date date check (birth_date > date '1900-01-01'),
  gender public.gender,
  bio text check (char_length(bio) <= 500),
  neighborhood text references public.neighborhoods (slug),
  occupation text check (char_length(occupation) <= 80),
  education text check (char_length(education) <= 80),
  languages text[] not null default '{}' check (cardinality(languages) <= 10),
  interests text[] not null default '{}' check (cardinality(interests) <= 15),
  personality text[] not null default '{}' check (cardinality(personality) <= 8),
  core_values text[] not null default '{}' check (cardinality(core_values) <= 8),
  lifestyle jsonb not null default '{}' check (jsonb_typeof(lifestyle) = 'object'),
  relationship_goal public.relationship_goal,
  locale public.app_locale not null default 'it',
  notify_likes boolean not null default true,
  is_hidden boolean not null default false,
  -- Fields below are managed by the system / admins only (see column grants).
  role public.user_role not null default 'user',
  verification public.verification_status not null default 'unverified',
  onboarding_completed_at timestamptz,
  suspended_at timestamptz,
  suspension_reason text,
  deleted_at timestamptz,
  last_active_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index profiles_discover_idx on public.profiles (last_active_at desc)
  where onboarding_completed_at is not null and deleted_at is null and suspended_at is null and not is_hidden;

create table public.preferences (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  interested_in public.gender[] not null default '{}',
  age_min smallint not null default 18 check (age_min >= 18),
  age_max smallint not null default 99 check (age_max <= 99),
  goals public.relationship_goal[] not null default '{}',
  updated_at timestamptz not null default now(),
  check (age_max >= age_min)
);

create table public.profile_photos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  storage_path text not null unique,
  position smallint not null default 0 check (position between 0 and 20),
  created_at timestamptz not null default now()
);
create index profile_photos_user_idx on public.profile_photos (user_id, position);

create table public.consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind public.consent_kind not null,
  version text not null,
  granted boolean not null,
  created_at timestamptz not null default now()
);
create index consents_user_idx on public.consents (user_id, kind, created_at desc);

create table public.verification_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  storage_path text not null,
  status public.verification_status not null default 'pending'
    check (status in ('pending', 'verified', 'rejected')),
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);
create unique index verification_one_pending_idx on public.verification_requests (user_id)
  where status = 'pending';

-- ---------------------------------------------------------------------------
-- Likes, passes, blocks, matches
-- ---------------------------------------------------------------------------
create table public.likes (
  from_user uuid not null references public.profiles (id) on delete cascade,
  to_user uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (from_user, to_user),
  check (from_user <> to_user)
);
create index likes_to_user_idx on public.likes (to_user, created_at desc);

create table public.passes (
  from_user uuid not null references public.profiles (id) on delete cascade,
  to_user uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (from_user, to_user),
  check (from_user <> to_user)
);

create table public.blocks (
  blocker_id uuid not null references public.profiles (id) on delete cascade,
  blocked_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);
create index blocks_blocked_idx on public.blocks (blocked_id);

create table public.matches (
  id uuid primary key default gen_random_uuid(),
  user_low uuid not null references public.profiles (id) on delete cascade,
  user_high uuid not null references public.profiles (id) on delete cascade,
  status public.match_status not null default 'active',
  created_at timestamptz not null default now(),
  closed_at timestamptz,
  check (user_low < user_high),
  unique (user_low, user_high)
);
create index matches_user_high_idx on public.matches (user_high);

-- ---------------------------------------------------------------------------
-- Exclusive connections & chat
-- ---------------------------------------------------------------------------
create table public.connections (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null unique references public.matches (id) on delete cascade,
  user_low uuid references public.profiles (id) on delete set null,
  user_high uuid references public.profiles (id) on delete set null,
  status public.connection_status not null default 'active',
  started_by uuid references public.profiles (id) on delete set null,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  ended_by uuid references public.profiles (id) on delete set null,
  end_reason public.connection_end_reason,
  -- 72h inactivity timer: who is waiting for a reply, and since when.
  -- pending_sender is null while nobody has written yet (timer runs from started_at).
  pending_sender uuid references public.profiles (id) on delete set null,
  pending_since timestamptz not null default now(),
  reminder_sent_at timestamptz,
  last_message_at timestamptz,
  check ((status = 'closed') = (ended_at is not null))
);
create index connections_timer_idx on public.connections (pending_since) where status = 'active';

create table public.connection_participants (
  connection_id uuid not null references public.connections (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  is_active boolean not null default true,
  last_read_at timestamptz,
  primary key (connection_id, user_id)
);
-- The core exclusivity guarantee: a user can be in at most ONE active connection.
create unique index connection_participants_one_active_idx
  on public.connection_participants (user_id) where is_active;

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  connection_id uuid not null references public.connections (id) on delete cascade,
  sender_id uuid references public.profiles (id) on delete set null,
  body text not null check (char_length(btrim(body)) between 1 and 2000),
  client_id uuid not null,
  created_at timestamptz not null default now(),
  unique (sender_id, client_id)
);
create index messages_connection_idx on public.messages (connection_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Billing (written only by the Stripe webhook using the service role)
-- ---------------------------------------------------------------------------
create table public.stripe_customers (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  stripe_customer_id text not null unique,
  created_at timestamptz not null default now()
);

create table public.subscriptions (
  id text primary key, -- Stripe subscription id
  user_id uuid not null references public.profiles (id) on delete cascade,
  status public.subscription_status not null,
  price_id text,
  cancel_at_period_end boolean not null default false,
  current_period_end timestamptz,
  canceled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index subscriptions_user_idx on public.subscriptions (user_id, status);

create table public.stripe_events (
  id text primary key, -- Stripe event id, guarantees idempotent processing
  type text not null,
  received_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Notifications
-- ---------------------------------------------------------------------------
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  type public.notification_type not null,
  data jsonb not null default '{}',
  read_at timestamptz,
  push_sent_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id, created_at desc);
create index notifications_push_idx on public.notifications (created_at) where push_sent_at is null;

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now()
);
create index push_subscriptions_user_idx on public.push_subscriptions (user_id);

-- ---------------------------------------------------------------------------
-- First Date & venues
-- ---------------------------------------------------------------------------
create table public.venues (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  category public.venue_category not null,
  neighborhood text references public.neighborhoods (slug),
  address text not null,
  description_it text not null default '',
  description_en text not null default '',
  price_level smallint not null default 2 check (price_level between 1 and 4),
  image_urls text[] not null default '{}',
  website text,
  -- Exclusive discount only when a real agreement exists.
  is_partner boolean not null default false,
  discount_it text,
  discount_en text,
  booking_mode public.booking_mode not null default 'none',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (is_partner or (discount_it is null and discount_en is null))
);

create table public.date_plans (
  id uuid primary key default gen_random_uuid(),
  connection_id uuid not null unique references public.connections (id) on delete cascade,
  status public.date_plan_status not null default 'opt_in',
  low_opted_in_at timestamptz,
  high_opted_in_at timestamptz,
  venue_id uuid references public.venues (id) on delete set null,
  scheduled_for timestamptz,
  proposed_by uuid references public.profiles (id) on delete set null,
  low_confirmed_at timestamptz,
  high_confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.booking_requests (
  id uuid primary key default gen_random_uuid(),
  date_plan_id uuid not null references public.date_plans (id) on delete cascade,
  venue_id uuid not null references public.venues (id) on delete cascade,
  requested_for timestamptz not null,
  party_size smallint not null default 2,
  status public.booking_status not null default 'requested',
  admin_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index booking_requests_status_idx on public.booking_requests (status, created_at desc);

-- ---------------------------------------------------------------------------
-- Trust & safety
-- ---------------------------------------------------------------------------
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references public.profiles (id) on delete set null,
  reported_user_id uuid references public.profiles (id) on delete set null,
  connection_id uuid references public.connections (id) on delete set null,
  message_id uuid references public.messages (id) on delete set null,
  -- Evidence copied at report time so it survives message retention purges.
  -- Readable only through the audited admin RPC.
  message_snapshot text,
  reason public.report_reason not null,
  details text check (char_length(details) <= 1000),
  status public.report_status not null default 'open',
  resolution_note text,
  resolved_by uuid references public.profiles (id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);
create index reports_status_idx on public.reports (status, created_at desc);

create table public.admin_audit_log (
  id bigint generated always as identity primary key,
  admin_id uuid references public.profiles (id) on delete set null,
  action text not null,
  target_type text not null,
  target_id text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table private.rate_limit_events (
  user_id uuid not null,
  action text not null,
  created_at timestamptz not null default now()
);
create index rate_limit_events_idx on private.rate_limit_events (user_id, action, created_at desc);

-- ---------------------------------------------------------------------------
-- updated_at maintenance
-- ---------------------------------------------------------------------------
create or replace function private.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_touch before update on public.profiles
  for each row execute function private.touch_updated_at();
create trigger preferences_touch before update on public.preferences
  for each row execute function private.touch_updated_at();
create trigger subscriptions_touch before update on public.subscriptions
  for each row execute function private.touch_updated_at();
create trigger venues_touch before update on public.venues
  for each row execute function private.touch_updated_at();
create trigger date_plans_touch before update on public.date_plans
  for each row execute function private.touch_updated_at();
create trigger booking_requests_touch before update on public.booking_requests
  for each row execute function private.touch_updated_at();
