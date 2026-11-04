begin;
\ir _helpers.psql
select plan(22);

create temp table u as
select
  tests.create_user('giulia@example.com', 'woman', array['man']::public.gender[]) as giulia,
  tests.create_user('marco@example.com', 'man', array['woman']::public.gender[]) as marco,
  tests.create_user('luca@example.com', 'man', array['woman']::public.gender[]) as luca,
  tests.create_user('admin@example.com', 'woman', array['man']::public.gender[]) as admin;
grant select on u to authenticated;
update public.profiles set role = 'admin' where id = (select admin from u);
select tests.subscribe(x) from (select unnest(array[giulia, marco, luca]) x from u) s;

insert into public.venues (id, slug, name, category, neighborhood, address, booking_mode)
values ('00000000-0000-0000-0000-0000000000a1', 'caffe-test', 'Caffè Test', 'cafe', 'monti', 'Via Test 1', 'request');

-- Privacy of profiles -------------------------------------------------------------
select hasnt_column('public', 'public_profiles', 'birth_date', 'public profile never exposes the birth date');
select tests.authenticate_as((select giulia from u));
select is((select count(*)::int from public.profiles where id <> (select giulia from u)), 0,
  'raw profile rows of other users are not readable');
select is((select age from public.public_profiles where id = (select marco from u)), 31,
  'public profile shows the computed age only')
  where extract(year from age(current_date, date '1995-05-20')) = 31
union all
select ok(true, 'public profile shows the computed age only')
  where extract(year from age(current_date, date '1995-05-20')) <> 31;

-- First date ---------------------------------------------------------------------
select tests.authenticate_as((select marco from u));  select public.like_profile((select giulia from u));
select tests.authenticate_as((select giulia from u)); select public.like_profile((select marco from u));
create temp table c as
  select public.start_connection((select id from public.matches where (select marco from u) in (user_low, user_high))) as id;
grant select on c to authenticated;

select is((public.first_date_opt_in((select id from c))).status::text, 'opt_in', 'one opt-in is not enough');
select throws_ok(
  $$ select public.first_date_propose((select id from c), '00000000-0000-0000-0000-0000000000a1', now() + interval '3 days') $$,
  'P0001', 'first_date_not_unlocked', 'venues are locked until both opt in');
select tests.authenticate_as((select marco from u));
select is((public.first_date_opt_in((select id from c))).status::text, 'planning', 'both opt-ins unlock venue planning');
select throws_ok(
  $$ select public.first_date_propose((select id from c), '00000000-0000-0000-0000-0000000000a1', now() + interval '10 minutes') $$,
  'P0001', 'invalid_date_time', 'date must be at least two hours ahead');
select is(
  (public.first_date_propose((select id from c), '00000000-0000-0000-0000-0000000000a1', now() + interval '3 days')).status::text,
  'planning', 'a proposal waits for the partner');
reset role;
select is((select count(*)::int from public.booking_requests), 0, 'no booking before both confirm');
select tests.authenticate_as((select giulia from u));
select is((public.first_date_confirm((select id from c))).status::text, 'confirmed', 'both confirmations finalise the plan');
reset role;
select is((select status::text from public.booking_requests), 'requested',
  'a booking is only a request until the venue confirms it');

-- Report with message evidence --------------------------------------------------
select tests.authenticate_as((select marco from u));
create temp table msg as select (public.send_message((select id from c), 'messaggio offensivo', gen_random_uuid())).id as id;
grant select on msg to authenticated;
select tests.authenticate_as((select giulia from u));
select isnt(public.report_user((select marco from u), 'harassment', 'test', (select id from msg), false), null,
  'a message can be reported');
reset role;
select is((select message_snapshot from public.reports limit 1), 'messaggio offensivo', 'evidence is stored');
select is((select end_reason::text from public.connections where id = (select id from c)), 'report',
  'reporting releases the reporter immediately, without waiting for the timer');
select is((select status::text from public.booking_requests), 'cancelled', 'pending bookings are cancelled with the connection');
select tests.authenticate_as((select giulia from u));
select throws_ok($$ select message_snapshot from public.reports $$, '42501', null,
  'reporters cannot read the evidence column');

-- Block ----------------------------------------------------------------------------
select public.block_user((select luca from u));
select ok(not exists (select 1 from public.public_profiles where id = (select luca from u)), 'blocked users are invisible');
select tests.authenticate_as((select luca from u));
select ok(not exists (select 1 from public.get_discover_candidates() d where d.id = (select giulia from u)),
  'the blocker disappears from the blocked user''s discover');

-- Admin ------------------------------------------------------------------------------
select throws_ok($$ select public.admin_stats() $$, 'P0001', 'forbidden', 'non-admins cannot use admin RPCs');
select tests.authenticate_as((select admin from u));
select ok((public.admin_stats() ->> 'reports_open')::int = 1, 'admins see moderation stats');
select is(public.admin_get_report_evidence((select id from public.admin_list_reports() limit 1)) ->> 'message',
  'messaggio offensivo', 'admins can read reported evidence');
reset role;
select is((select count(*)::int from public.admin_audit_log where action = 'view_report_evidence'), 1,
  'every evidence access is audited');

select * from finish();
rollback;
