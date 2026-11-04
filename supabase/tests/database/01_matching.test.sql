begin;
\ir _helpers.psql
select plan(14);

-- Age gate at signup ---------------------------------------------------------
select throws_ok(
  $$ insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at)
     values (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
             'kid@example.com', jsonb_build_object('birth_date', (current_date - interval '17 years')::date), now(), now()) $$,
  'P0001', 'underage', 'signup is rejected for users under 18'
);

create temp table u as
select
  tests.create_user('giulia@example.com', 'woman', array['man']::public.gender[]) as giulia,
  tests.create_user('marco@example.com', 'man', array['woman']::public.gender[]) as marco,
  tests.create_user('luca@example.com', 'man', array['woman']::public.gender[]) as luca,
  tests.create_user('anna@example.com', 'woman', array['woman']::public.gender[]) as anna;
grant select on u to authenticated;

select ok(exists (select 1 from public.preferences where user_id = (select giulia from u)),
  'profile and preferences are created on signup');

-- Birth date cannot be changed by the user once set
select tests.authenticate_as((select giulia from u));
select throws_ok(
  $$ update public.profiles set birth_date = '1990-01-01' where id = (select giulia from u) $$,
  'P0001', 'birth_date_locked', 'birth date is locked once set'
);
select throws_ok(
  $$ update public.profiles set role = 'admin' where id = (select giulia from u) $$,
  '42501', null, 'users cannot escalate their role'
);

-- Discover: mutual preferences are hard filters
select ok(
  (select count(*) from public.get_discover_candidates(100) c where c.id in ((select marco from u), (select luca from u))) = 2,
  'giulia discovers men interested in women'
);
select ok(
  not exists (select 1 from public.get_discover_candidates(100) c where c.id = (select anna from u)),
  'anna (only interested in women) is not proposed to giulia (and vice versa)'
);
select ok(
  not exists (select 1 from public.get_discover_candidates(100) c where c.id = (select giulia from u)),
  'users never see themselves'
);

-- One-sided like ---------------------------------------------------------------
select is(public.like_profile((select marco from u)) ->> 'status', 'liked', 'first like is recorded');
select is(public.like_profile((select marco from u)) ->> 'status', 'liked', 'liking twice is idempotent');
reset role;
select is((select count(*)::int from public.likes where from_user = (select giulia from u)), 1, 'no duplicate like rows');

-- Mutual like => one match ------------------------------------------------------
select tests.authenticate_as((select marco from u));
select is(public.like_profile((select giulia from u)) ->> 'status', 'matched', 'mutual like creates a match');
reset role;
select is(
  (select count(*)::int from public.matches
   where user_low = least((select giulia from u), (select marco from u))
     and user_high = greatest((select giulia from u), (select marco from u))),
  1, 'exactly one match row'
);
select is(
  (select count(*)::int from public.notifications where type = 'mutual_match'
   and user_id in ((select giulia from u), (select marco from u))),
  2, 'both users are notified of the match'
);

-- Direct writes are impossible ---------------------------------------------------
select tests.authenticate_as((select luca from u));
select throws_ok(
  $$ insert into public.likes (from_user, to_user) values ((select luca from u), (select giulia from u)) $$,
  '42501', null, 'likes cannot be inserted directly, only through like_profile()'
);
reset role;

select * from finish();
rollback;
