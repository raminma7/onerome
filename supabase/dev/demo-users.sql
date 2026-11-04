-- LOCAL DEVELOPMENT ONLY — never run against production.
-- Creates confirmed demo accounts (password: OneRome-demo-2026) so the UI can
-- be explored locally. Run with:
--   psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -f supabase/dev/demo-users.sql
do $$
declare
  r record;
  v_id uuid;
begin
  for r in
    select * from (values
      ('giulia@demo.onerome.local', 'Giulia', 'woman'::public.gender, array['man']::public.gender[], date '1994-03-12', 'monti', 'long_term'::public.relationship_goal, array['art','cinema','wine','travel','museums'], array['family','honesty','culture'], '{"smoking":"never","drinking":"socially","exercise":"sometimes","children":"want"}'),
      ('marco@demo.onerome.local', 'Marco', 'man', array['woman']::public.gender[], date '1991-07-02', 'trastevere', 'long_term', array['cinema','cooking','wine','football','travel'], array['family','loyalty','humour'], '{"smoking":"never","drinking":"socially","exercise":"often","children":"want"}'),
      ('luca@demo.onerome.local', 'Luca', 'man', array['woman']::public.gender[], date '1988-11-20', 'prati', 'marriage', array['history','opera','reading','coffee'], array['faith','family','honesty'], '{"smoking":"never","drinking":"never","exercise":"sometimes","children":"want"}'),
      ('sofia@demo.onerome.local', 'Sofia', 'woman', array['man']::public.gender[], date '1997-01-30', 'pigneto', 'figuring_out', array['music_live','photography','street_food','cycling'], array['freedom','creativity','sustainability'], '{"smoking":"sometimes","drinking":"often","exercise":"sometimes","children":"open"}'),
      ('alessandro@demo.onerome.local', 'Alessandro', 'man', array['woman']::public.gender[], date '1993-05-18', 'monteverde', 'long_term', array['art','architecture','wine','hiking','travel'], array['honesty','culture','personal_growth'], '{"smoking":"never","drinking":"socially","exercise":"often","children":"open"}')
    ) as t(email, name, gender, interested, birth, hood, goal, interests, vals, lifestyle)
  loop
    select id into v_id from auth.users where email = r.email;
    if v_id is null then
      v_id := gen_random_uuid();
      insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
                              raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
                              confirmation_token, recovery_token, email_change_token_new, email_change)
      values (v_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', r.email,
              extensions.crypt('OneRome-demo-2026', extensions.gen_salt('bf')), now(),
              '{"provider":"email","providers":["email"]}', jsonb_build_object('birth_date', r.birth, 'locale', 'it'),
              now(), now(), '', '', '', '');
      insert into auth.identities (id, user_id, provider_id, identity_data, provider, created_at, updated_at, last_sign_in_at)
      values (gen_random_uuid(), v_id, v_id::text, jsonb_build_object('sub', v_id::text, 'email', r.email), 'email', now(), now(), now());
    end if;
    update public.profiles set display_name = r.name, gender = r.gender, neighborhood = r.hood, relationship_goal = r.goal,
      interests = r.interests, core_values = r.vals, languages = array['it','en'], lifestyle = r.lifestyle::jsonb,
      bio = 'Profilo demo per lo sviluppo locale.', onboarding_completed_at = now()
    where id = v_id;
    update public.preferences set interested_in = r.interested, age_min = 25, age_max = 45 where user_id = v_id;
    insert into public.profile_photos (user_id, storage_path) values (v_id, v_id::text || '/demo.webp') on conflict do nothing;
    insert into public.consents (user_id, kind, version, granted) values (v_id, 'terms', 'dev', true), (v_id, 'sensitive_data', 'dev', true);
  end loop;
  -- Giulia is an admin in the local demo.
  update public.profiles set role = 'admin' where id = (select id from auth.users where email = 'giulia@demo.onerome.local');
end;
$$;
