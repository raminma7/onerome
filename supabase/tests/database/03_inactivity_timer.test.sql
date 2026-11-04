begin;
\ir _helpers.psql
select plan(19);

create temp table u as
select
  tests.create_user('giulia@example.com', 'woman', array['man']::public.gender[]) as giulia,
  tests.create_user('marco@example.com', 'man', array['woman']::public.gender[]) as marco,
  tests.create_user('elena@example.com', 'woman', array['man']::public.gender[]) as elena,
  tests.create_user('paolo@example.com', 'man', array['woman']::public.gender[]) as paolo;
grant select on u to authenticated;
select tests.subscribe(x) from (select unnest(array[giulia, marco, elena, paolo]) x from u) s;

-- Two couples: giulia+marco (chatting) and elena+paolo (silent).
select tests.authenticate_as((select marco from u));  select public.like_profile((select giulia from u));
select tests.authenticate_as((select giulia from u)); select public.like_profile((select marco from u));
select tests.authenticate_as((select paolo from u));  select public.like_profile((select elena from u));
select tests.authenticate_as((select elena from u));  select public.like_profile((select paolo from u));

select tests.authenticate_as((select giulia from u));
create temp table c1 as
  select public.start_connection((select id from public.matches where (select marco from u) in (user_low, user_high))) as id;
select tests.authenticate_as((select elena from u));
create temp table c2 as
  select public.start_connection((select id from public.matches where (select paolo from u) in (user_low, user_high))) as id;
reset role;
grant select on c1, c2 to authenticated;

select is((select pending_sender from public.connections where id = (select id from c1)), null,
  'empty chat: nobody is pending, the timer runs from the start');

-- Timer starts at the first unanswered message ------------------------------------
-- Simulate time passing by moving pending_since into the past.
update public.connections set pending_since = now() - interval '10 hours' where id = (select id from c1);
select tests.authenticate_as((select giulia from u));
select public.send_message((select id from c1), 'Ciao!', gen_random_uuid());
reset role;
select is((select pending_sender from public.connections where id = (select id from c1)), (select giulia from u),
  'first message starts the timer for the receiver');
select ok((select pending_since > now() - interval '1 minute' from public.connections where id = (select id from c1)),
  'timer starts at the first unanswered message');

-- Consecutive messages from the same sender do not restart the timer.
update public.connections set pending_since = now() - interval '20 hours' where id = (select id from c1);
select tests.authenticate_as((select giulia from u));
select public.send_message((select id from c1), 'Ci sei?', gen_random_uuid());
reset role;
select ok((select pending_since < now() - interval '19 hours' from public.connections where id = (select id from c1)),
  'consecutive messages by the same sender keep the original timer');

-- Idempotent retries (same client_id) never duplicate messages.
select tests.authenticate_as((select giulia from u));
select public.send_message((select id from c1), 'Retry', '11111111-1111-1111-1111-111111111111');
select public.send_message((select id from c1), 'Retry', '11111111-1111-1111-1111-111111111111');
reset role;
select is((select count(*)::int from public.messages where client_id = '11111111-1111-1111-1111-111111111111'), 1,
  'retrying with the same client_id stores the message once');

-- 48h reminder, sent exactly once ---------------------------------------------
update public.connections set pending_since = now() - interval '49 hours' where id in ((select id from c1), (select id from c2));
create temp table run1 as select private.process_connection_timeouts() as r;
select is((select (r ->> 'reminders')::int from run1), 2, 'a reminder is sent for each connection past 48h');
select is((select (r ->> 'closed')::int from run1), 0, 'nothing is closed before 72h');
select is(
  (select count(*)::int from public.notifications where type = 'inactivity_reminder' and data ->> 'connection_id' = (select id from c1)::text),
  2, 'both participants of the active chat are reminded');
select is(
  (select data ->> 'awaiting' from public.notifications
   where type = 'inactivity_reminder' and user_id = (select marco from u)),
  'you', 'the person who has to reply is told so');
select is((private.process_connection_timeouts() ->> 'reminders')::int, 0, 'reminders are never duplicated');

-- A real reply ends the old timer and starts a new one for the other side --------
select tests.authenticate_as((select marco from u));
select public.send_message((select id from c1), 'Scusa, eccomi!', gen_random_uuid());
reset role;
select is((select pending_sender from public.connections where id = (select id from c1)), (select marco from u),
  'reply moves the timer to the other person');
select ok((select pending_since > now() - interval '1 minute' and reminder_sent_at is null
           from public.connections where id = (select id from c1)),
  'reply resets the timer and the reminder flag');

-- 72h without reply closes the connection --------------------------------------
update public.connections set pending_since = now() - interval '73 hours' where id in ((select id from c1), (select id from c2));
select is((private.process_connection_timeouts() ->> 'closed')::int, 2,
  'both the unanswered chat and the empty chat are closed after 72h');
select is((select end_reason::text from public.connections where id = (select id from c1)), 'timeout', 'end reason is timeout');
select is((select end_reason::text from public.connections where id = (select id from c2)), 'timeout',
  'a chat where nobody wrote is closed after 72h too');
select is((select count(*)::int from public.connection_participants
           where connection_id in ((select id from c1), (select id from c2)) and is_active), 0,
  'exclusive status is released for all four users');
select is((select count(*)::int from public.notifications
           where type = 'connection_ended' and data ->> 'reason' = 'timeout'), 4,
  'everyone is notified of the automatic end');
select is((private.process_connection_timeouts() ->> 'closed')::int, 0, 'running the job again changes nothing');

-- Freed users can like again --------------------------------------------------
select tests.authenticate_as((select giulia from u));
select is(public.like_profile((select paolo from u)) ->> 'status', 'liked', 'after a timeout users can like again');
reset role;

select * from finish();
rollback;
