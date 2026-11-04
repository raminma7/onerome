/**
 * Integration test against a real Postgres (local Supabase): two users try to
 * start an exclusive connection with the same person at the same moment.
 * Exactly one must win. Skipped when the database is not reachable.
 */
import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const URL = process.env.DATABASE_URL ?? "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
let admin: Client;
let available = true;
const ids: Record<string, string> = {};

async function createUser(name: string, gender: string, interested: string) {
  const { rows } = await admin.query(
    `insert into auth.users (id, instance_id, aud, role, email, email_confirmed_at, raw_user_meta_data, created_at, updated_at)
     values (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', $1, now(),
             '{"birth_date":"1992-01-01"}', now(), now()) returning id`,
    [`${name}-${Date.now()}@race.test`],
  );
  const id = rows[0].id as string;
  await admin.query(
    `update public.profiles set display_name=$2, gender=$3, neighborhood='monti', relationship_goal='long_term',
       interests=array['art','cinema','wine'], languages=array['it'], onboarding_completed_at=now() where id=$1`,
    [id, name, gender],
  );
  await admin.query(`update public.preferences set interested_in=array[$2]::public.gender[] where user_id=$1`, [id, interested]);
  await admin.query(`insert into public.profile_photos (user_id, storage_path, face_status) values ($1::uuid, $2, 'solo')`, [id, `${id}/race.webp`]);
  await admin.query(`update public.profiles set verification='verified', verified_photo_id=(select id from public.profile_photos where user_id=$1::uuid limit 1) where id=$1::uuid`, [id]);
  await admin.query(`insert into public.subscriptions (id, user_id, status, current_period_end) values ($1, $2, 'active', now() + interval '30 days')`, [`sub_race_${id}`, id]);
  return id;
}

async function asUser(userId: string, sql: string, params: unknown[]) {
  const c = new Client({ connectionString: URL });
  await c.connect();
  try {
    await c.query("begin");
    await c.query(`select set_config('request.jwt.claims', $1, true), set_config('role', 'authenticated', true)`, [JSON.stringify({ sub: userId, role: "authenticated" })]);
    const res = await c.query(sql, params);
    await c.query("commit");
    return { ok: true as const, rows: res.rows };
  } catch (e) {
    await c.query("rollback").catch(() => {});
    return { ok: false as const, error: (e as Error).message };
  } finally {
    await c.end();
  }
}

beforeAll(async () => {
  admin = new Client({ connectionString: URL });
  try {
    await admin.connect();
  } catch {
    available = false;
    return;
  }
  ids.anna = await createUser("anna", "woman", "man");
  ids.bruno = await createUser("bruno", "man", "woman");
  ids.carlo = await createUser("carlo", "man", "woman");
  for (const [a, b] of [["bruno", "anna"], ["carlo", "anna"], ["anna", "bruno"], ["anna", "carlo"]]) {
    const r = await asUser(ids[a], "select public.like_profile($1)", [ids[b]]);
    if (!r.ok) throw new Error(r.error);
  }
});

afterAll(async () => {
  if (!available) return;
  await admin.query("delete from auth.users where id = any($1::uuid[])", [Object.values(ids)]);
  await admin.end();
});

describe("exclusive connection race", () => {
  it("only one of two simultaneous start_connection calls succeeds", async (ctx) => {
    if (!available) ctx.skip();
    const match = async (other: string) =>
      (await admin.query("select id from public.matches where user_low = least($1::uuid,$2::uuid) and user_high = greatest($1::uuid,$2::uuid)", [ids.anna, ids[other]])).rows[0].id;
    const [mBruno, mCarlo] = [await match("bruno"), await match("carlo")];

    const results = await Promise.all([
      asUser(ids.bruno, "select public.start_connection($1)", [mBruno]),
      asUser(ids.carlo, "select public.start_connection($1)", [mCarlo]),
    ]);
    expect(results.filter((r) => r.ok)).toHaveLength(1);
    const loser = results.find((r) => !r.ok)!;
    expect(["partner_in_connection", "exclusive_connection_active"]).toContain(loser.error);

    const { rows } = await admin.query("select count(*)::int as n from public.connection_participants where user_id = $1 and is_active", [ids.anna]);
    expect(rows[0].n).toBe(1);
  });
});
