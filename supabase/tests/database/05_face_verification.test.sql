begin;
\ir _helpers.psql
select plan(15);

create temp table u as
select
  tests.create_user('vera@example.com', 'woman', array['man']::public.gender[]) as vera,
  tests.create_user('nico@example.com', 'man', array['woman']::public.gender[], date '1994-02-02', true, false) as nico,
  tests.create_user('dario@example.com', 'man', array['woman']::public.gender[]) as dario;
grant select on u to authenticated;

-- Unverified profiles are invisible --------------------------------------------
select tests.authenticate_as((select vera from u));
select ok(not exists (select 1 from public.get_discover_candidates() c where c.id = (select nico from u)),
  'unverified users never appear in discover');
select ok(exists (select 1 from public.get_discover_candidates() c where c.id = (select dario from u)),
  'verified users appear in discover');
select ok(not exists (select 1 from public.public_profiles where id = (select nico from u)),
  'unverified profiles are not readable by others');
select throws_ok($$ select public.like_profile((select nico from u)) $$, 'P0001', 'target_unavailable',
  'unverified users cannot be liked');

-- Unverified users can browse but not interact ---------------------------------
select tests.authenticate_as((select nico from u));
select ok(exists (select 1 from public.get_discover_candidates() c where c.id = (select vera from u)),
  'unverified users can still browse verified profiles');
select throws_ok($$ select public.like_profile((select vera from u)) $$, 'P0001', 'verification_required',
  'unverified users cannot like');
select ok(exists (select 1 from public.public_profiles where id = (select nico from u)), 'users always see their own profile');

-- Users cannot self-verify -------------------------------------------------------
select throws_ok($$ update public.profiles set verification = 'verified' where id = (select nico from u) $$,
  '42501', null, 'verification status cannot be set by the user');
select throws_ok($$ update public.profiles set verified_photo_id = null where id = (select nico from u) $$,
  '42501', null, 'verified photo cannot be changed by the user');
select throws_ok(
  $$ insert into public.face_verifications (user_id, status) values ((select nico from u), 'passed') $$,
  '42501', null, 'verification results can only be written by the server');
reset role;

-- Removing the verified photo removes the verification ---------------------------
select tests.authenticate_as((select dario from u));
delete from public.profile_photos where user_id = (select dario from u);
reset role;
select is((select verification::text from public.profiles where id = (select dario from u)), 'unverified',
  'deleting the verified photo resets the verification');
select tests.authenticate_as((select vera from u));
select ok(not exists (select 1 from public.get_discover_candidates() c where c.id = (select dario from u)),
  'and hides the profile again');
reset role;

-- Manual review fallback: an admin approval verifies and binds the cover photo ---------
update public.profiles set role = 'admin' where id = (select vera from u);
select tests.authenticate_as((select nico from u));
select public.request_verification((select nico from u)::text || '/selfie.jpg');
select tests.authenticate_as((select vera from u));
select lives_ok($$ select public.admin_review_verification((select id from public.verification_requests where user_id = (select nico from u)), true) $$,
  'admins can approve a manual review');
reset role;
select is((select verification::text from public.profiles where id = (select nico from u)), 'verified', 'manual approval verifies the user');
select ok((select verified_photo_id is not null from public.profiles where id = (select nico from u)), 'verification is bound to the cover photo');

select * from finish();
rollback;
