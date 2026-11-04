begin;
\ir _helpers.psql
select plan(12);

create temp table u as
select
  tests.create_user('anna@example.com', 'woman', array['man']::public.gender[]) as anna,
  tests.create_user('bruno@example.com', 'man', array['woman']::public.gender[]) as bruno;
grant select on u to authenticated;

-- Bruno adds photos: a group photo, a landscape and someone else's photo (server sets statuses)
insert into public.profile_photos (user_id, storage_path, position, face_status) values
  ((select bruno from u), (select bruno from u)::text || '/group.webp', 1, 'with_others'),
  ((select bruno from u), (select bruno from u)::text || '/sea.webp', 2, 'no_face'),
  ((select bruno from u), (select bruno from u)::text || '/model.webp', 3, 'mismatch'),
  ((select bruno from u), (select bruno from u)::text || '/new.webp', 4, 'unchecked');

-- What others see ---------------------------------------------------------------
select tests.authenticate_as((select anna from u));
select is(
  (select cardinality(photo_paths) from public.public_profiles where id = (select bruno from u)), 3,
  'others see only checked photos of the user (cover, group, landscape)');
select ok(
  not exists (select 1 from public.public_profiles where id = (select bruno from u) and (select bruno from u)::text || '/model.webp' = any (photo_paths)),
  'photos of other people are never shown');
select is(
  (select count(*)::int from public.profile_photos where user_id = (select bruno from u)), 3,
  'mismatched and unchecked photo rows are hidden from others');
select is(
  (select cardinality(photo_paths) from public.get_discover_candidates() where id = (select bruno from u)), 3,
  'discover only returns allowed photos');

-- Owner sees everything (with statuses)
select tests.authenticate_as((select bruno from u));
select is((select count(*)::int from public.profile_photos where user_id = (select bruno from u)), 5,
  'the owner sees all own photos');

-- Users cannot fake the face status
select throws_ok($$ update public.profile_photos set face_status = 'solo' where user_id = (select bruno from u) $$,
  '42501', null, 'face status cannot be changed by the user');
select throws_ok(
  $$ insert into public.profile_photos (user_id, storage_path, face_status) values ((select bruno from u), (select bruno from u)::text || '/x.webp', 'solo') $$,
  '42501', null, 'face status cannot be set on upload by the user');

-- Cover rule: a non-solo cover hides the profile ------------------------------
select lives_ok($$ update public.profile_photos set position = case when storage_path like '%/sea.webp' then 0 else position + 1 end where user_id = (select bruno from u) $$,
  'the user can reorder photos');
reset role;
select tests.authenticate_as((select anna from u));
select ok(not exists (select 1 from public.get_discover_candidates() where id = (select bruno from u)),
  'a cover without the user''s face hides the profile');
reset role;

-- Deleting the verified photo moves verification to another solo photo ---------
insert into public.profile_photos (user_id, storage_path, position, face_status)
values ((select bruno from u), (select bruno from u)::text || '/solo2.webp', 9, 'solo');
delete from public.profile_photos where id = (select verified_photo_id from public.profiles where id = (select bruno from u));
select is((select verification::text from public.profiles where id = (select bruno from u)), 'verified',
  'verification moves to another photo that shows the user alone');
select is((select storage_path from public.profile_photos where id = (select verified_photo_id from public.profiles where id = (select bruno from u))),
  (select bruno from u)::text || '/solo2.webp', 'the new verified photo is the other solo photo');

delete from public.profile_photos where storage_path = (select bruno from u)::text || '/solo2.webp';
select is((select verification::text from public.profiles where id = (select bruno from u)), 'unverified',
  'with no solo photo left, the verification is revoked');

select * from finish();
rollback;
