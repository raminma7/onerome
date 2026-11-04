begin;
\ir _helpers.psql
select plan(23);

create temp table u as
select
  tests.create_user('giulia@example.com', 'woman', array['man']::public.gender[]) as giulia,
  tests.create_user('marco@example.com', 'man', array['woman']::public.gender[]) as marco,
  tests.create_user('luca@example.com', 'man', array['woman']::public.gender[]) as luca,
  tests.create_user('sara@example.com', 'woman', array['man']::public.gender[]) as sara;
grant select on u to authenticated;

-- giulia <-> marco and giulia <-> luca are mutual matches
select tests.authenticate_as((select marco from u));
select public.like_profile((select giulia from u));
select tests.authenticate_as((select luca from u));
select public.like_profile((select giulia from u));
select tests.authenticate_as((select giulia from u));
select public.like_profile((select marco from u));
select public.like_profile((select luca from u));
reset role;

create temp table mm as
select
  (select id from public.matches where (select marco from u) in (user_low, user_high)) as giulia_marco,
  (select id from public.matches where (select luca from u) in (user_low, user_high)) as giulia_luca;
grant select on mm to authenticated;

-- Subscription gate -------------------------------------------------------------
select tests.authenticate_as((select giulia from u));
select throws_ok($$ select public.start_connection((select giulia_marco from mm)) $$,
  'P0001', 'subscription_required', 'chat requires an active subscription');
reset role;
select tests.subscribe((select giulia from u));
select tests.authenticate_as((select giulia from u));
select throws_ok($$ select public.start_connection((select giulia_marco from mm)) $$,
  'P0001', 'partner_subscription_required', 'chat requires the partner to be subscribed too');
reset role;
select tests.subscribe((select marco from u));
select tests.subscribe((select luca from u));

-- Start the exclusive connection ------------------------------------------------
select tests.authenticate_as((select giulia from u));
create temp table cc as select public.start_connection((select giulia_marco from mm)) as id;
grant select on cc to authenticated;
select isnt((select id from cc), null, 'exclusive connection started');

select throws_ok($$ select public.start_connection((select giulia_luca from mm)) $$,
  'P0001', 'exclusive_connection_active', 'only one active connection per user');
select throws_ok($$ select public.like_profile((select sara from u)) $$,
  'P0001', 'exclusive_connection_active', 'no likes during an exclusive connection');
select throws_ok($$ select * from public.get_discover_candidates() $$,
  'P0001', 'exclusive_connection_active', 'discover is closed during an exclusive connection');

select tests.authenticate_as((select luca from u));
select throws_ok($$ select public.start_connection((select giulia_luca from mm)) $$,
  'P0001', 'partner_in_connection', 'partner already in a connection cannot be pulled into another');
select throws_ok($$ select public.like_profile((select giulia from u)) $$,
  'P0001', 'target_unavailable', 'users in a connection cannot receive likes');
select ok(not exists (select 1 from public.get_discover_candidates() c where c.id = (select giulia from u)),
  'users in a connection disappear from discover');

-- Unique index is the last line of defence
reset role;
select ok(
  (select count(*) from public.connection_participants where user_id = (select giulia from u) and is_active) = 1,
  'database holds exactly one active participation for giulia'
);

-- Chat & RLS --------------------------------------------------------------------
select tests.authenticate_as((select giulia from u));
select lives_ok($$ select public.send_message((select id from cc), 'Ciao Marco!', gen_random_uuid()) $$,
  'participant can send a message');
select throws_ok($$ select public.send_message((select id from cc), '   ', gen_random_uuid()) $$,
  'P0001', 'invalid_message', 'empty messages are rejected');

select tests.authenticate_as((select luca from u));
select is((select count(*)::int from public.messages where connection_id = (select id from cc)), 0,
  'non-participants cannot read the conversation');
select throws_ok($$ select public.send_message((select id from cc), 'hi', gen_random_uuid()) $$,
  'P0001', 'not_participant', 'non-participants cannot write');
select throws_ok(
  $$ insert into public.messages (connection_id, sender_id, body, client_id)
     values ((select id from cc), (select luca from u), 'x', gen_random_uuid()) $$,
  '42501', null, 'messages cannot be inserted directly');

select tests.authenticate_as((select marco from u));
select is((select count(*)::int from public.messages where connection_id = (select id from cc)), 1,
  'the partner reads the conversation');

-- Expired subscription pauses messaging but not ending the connection ----------
reset role;
update public.subscriptions set status = 'canceled' where user_id = (select marco from u);
select tests.authenticate_as((select marco from u));
select throws_ok($$ select public.send_message((select id from cc), 'ci sei?', gen_random_uuid()) $$,
  'P0001', 'subscription_required', 'expired subscription blocks new messages');
select tests.authenticate_as((select giulia from u));
select throws_ok($$ select public.send_message((select id from cc), 'ci sei?', gen_random_uuid()) $$,
  'P0001', 'partner_subscription_inactive', 'partner expired subscription pauses the chat');

-- End connection: unilateral, idempotent ---------------------------------------
select tests.authenticate_as((select marco from u));
select ok(public.end_connection((select id from cc)), 'either participant can end the connection without consent');
select ok(not public.end_connection((select id from cc)), 'ending twice is a no-op');
reset role;
select is((select status::text from public.connections where id = (select id from cc)), 'closed', 'connection is closed');
select tests.subscribe((select marco from u));
select tests.authenticate_as((select giulia from u));
select throws_ok($$ select public.send_message((select id from cc), 'ultimo', gen_random_uuid()) $$,
  'P0001', 'connection_closed', 'closed chats are read-only');

-- After ending, both are free again
select lives_ok($$ select public.start_connection((select giulia_luca from mm)) $$,
  'after the end, a new exclusive connection can start');
reset role;

select * from finish();
rollback;
