# OneRome

A bilingual (🇮🇹 Italian by default, 🇬🇧 English) dating web app for singles over 18 living in Rome.
Its core idea is the **Exclusive Connection**: once a chat starts, both people are locked into that single
conversation (no new likes, matches or chats) until one of them ends it, or until the **72-hour inactivity
rule** closes it automatically.

- **Web**: Next.js 16 (App Router) · TypeScript · Tailwind CSS v4 · shadcn-style UI on Radix · next-intl
- **Backend**: Supabase (Postgres + RLS, Auth, Storage, Realtime, pg_cron, Edge Functions)
- **Payments**: Stripe Checkout, Customer Portal and webhooks (€5.99/month)
- **PWA**: installable, offline fallback, Web Push

---

## Architecture

```
Browser / PWA ─┬─ Next.js (UI, server actions, /api routes) ──┐
               │                                               ├─► Supabase Postgres (RLS + RPCs)  ◄── pg_cron jobs
Future iOS/   ─┴─ supabase-js directly (same RPCs, same RLS) ──┘          │
Android apps                                                              ├─► Realtime (chat, notifications)
                                                                          └─► Edge Function push-dispatch ─► Web Push
Stripe ──webhook──► /api/stripe/webhook ──(service role)──► subscriptions
```

**All business rules live in the database**, as atomic `SECURITY DEFINER` functions protected by RLS,
unique indexes and row locks. The Next.js layer is thin, so a native app can call exactly the same
functions (`like_profile`, `start_connection`, `send_message`, …) without rewriting the backend.

| Rule | Where it is enforced |
| --- | --- |
| 18+ only | `handle_new_user` trigger (signup), `profiles_guard` trigger, `complete_onboarding()` |
| One active connection per user | partial unique index `connection_participants_one_active_idx` + ordered row locks in `start_connection()` |
| No likes/matches/discover during a connection | `like_profile()`, `get_discover_candidates()` |
| Chat needs both subscriptions | `start_connection()`, `send_message()` read `subscriptions` (written only by the Stripe webhook) |
| 72-hour timer, 48-hour reminder | `send_message()` maintains `pending_sender/pending_since`; `private.process_connection_timeouts()` runs every 5 minutes via pg_cron (`FOR UPDATE SKIP LOCKED`, idempotent) |
| Leave at any time | `end_connection()`, `block_user()`, `report_user()`: unilateral, no timer |
| Private data | RLS on every table, column-level grants, `public_profiles` view (age only, never birth date), private storage buckets with signed URLs |
| Moderation access to messages | only the reported message, via `admin_get_report_evidence()`, which is written to `admin_audit_log` |

### 72-hour rule (exact semantics)
- When a connection starts with no messages, the timer runs from the start time. If nobody writes for 72h, it closes.
- The first unanswered message starts the timer. Further messages from the **same** sender do **not** restart it.
- A real reply from the other person ends that timer and starts a new one, owed by the original sender.
- At 48h a reminder notification is sent, once per timer. At 72h the connection closes, both users are released and notified.
- If a subscription lapses, messaging pauses but the timer keeps running, so nobody can be held indefinitely.

### Compatibility score
`src/lib/compatibility` holds a deterministic, explainable weighted score (0–100). It covers relationship goals (30),
shared interests (20), values (15), lifestyle (15), languages (10) and neighbourhood proximity (10).
Factors with missing data are excluded rather than penalised. Weights are configurable. Each suggestion shows up to
four human-readable reasons. Hard filters (mutual gender preference, mutual age range, accepted goals, blocks,
availability, users already seen) run **in SQL before scoring**.

---

## Project structure

```
src/
  app/[locale]/(public)     landing, privacy, terms
  app/[locale]/(auth)       login, register, check-email, forgot/reset password
  app/[locale]/onboarding   multi-step onboarding (draft survives language switch)
  app/[locale]/(app)        discover, likes, profile/[id], connection, connection/chat,
                            first-date, billing, notifications, settings, safety, admin/*
  app/api                   auth/confirm, stripe/webhook, account/export
  components                UI primitives and feature components
  lib                       supabase clients, compatibility, validation, billing sync, errors, logger
  messages/{it,en}.json     all UI strings (type-checked keys; parity enforced by a test)
  server/actions            server actions (thin wrappers over RPCs)
  proxy.ts                  locale routing + session refresh + route protection
supabase/
  migrations/               schema, security (RLS), core logic, admin, cron/realtime
  functions/push-dispatch   Web Push sender (Deno)
  tests/database            pgTAP suites
  seed.sql                  editorial list of public venues in Rome (no fake partnerships)
  dev/demo-users.sql        LOCAL ONLY demo accounts
```

---

## Running locally

Requirements: Node 20+, pnpm, Docker.

```bash
pnpm install
pnpm exec supabase start          # Postgres, Auth, Storage, Realtime, Mailpit…
cp .env.example .env.local        # fill the Supabase keys printed by `supabase status`
pnpm exec supabase db reset       # applies migrations + seed
pnpm dev                          # http://localhost:3000
```

Confirmation emails are delivered to Mailpit at http://127.0.0.1:54324.

Optional demo data (local only): `psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -f supabase/dev/demo-users.sql`
creates five confirmed accounts (`giulia@demo.onerome.local`, …, password `OneRome-demo-2026`). Giulia is an admin.

### Scripts

| Command | What it does |
| --- | --- |
| `pnpm dev` / `pnpm build` / `pnpm start` | Next.js |
| `pnpm typecheck` | route typegen + `tsc --noEmit` |
| `pnpm lint` | ESLint |
| `pnpm test` | Vitest: compatibility, validation, translations parity, notifications, Stripe webhook, **real-DB race test** for exclusive connections |
| `pnpm test:db` | pgTAP suites (matching, exclusive connection, 72h timer, safety, first date, admin, RLS) against the local DB |
| `pnpm db:types` | regenerate `src/lib/supabase/database.types.ts` |

---

## Connecting the services

### 1. Supabase (production)
1. Create a project and link it: `pnpm exec supabase link --project-ref <ref>`, then `pnpm exec supabase db push`.
2. Auth → URL configuration: Site URL = your domain; add `https://<domain>/api/auth/confirm` to the redirect URLs.
3. Auth → Email: keep **Confirm email** enabled and configure a real SMTP sender.
4. Set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` on the web host.
5. Make yourself an admin: `update public.profiles set role = 'admin' where id = '<your user id>';`

### 2. Stripe (use **test mode** in development)
1. Create a product "OneRome Plus" with a recurring **€5.99 / month** price, then set `STRIPE_PRICE_ID`.
2. Set `STRIPE_SECRET_KEY` (server only, never `NEXT_PUBLIC_`).
3. Webhook endpoint: `https://<domain>/api/stripe/webhook` with these events: `checkout.session.completed`,
   `customer.subscription.created|updated|deleted|paused|resumed`, `invoice.paid`, `invoice.payment_failed`.
   Set `STRIPE_WEBHOOK_SECRET`.
4. Locally: `stripe listen --forward-to localhost:3000/api/stripe/webhook`.
5. Enable the Customer Portal (cancel at period end, update payment method).

Until the keys are set, the billing page clearly shows "service not configured". No fake payments are ever simulated.

### 3. Web Push (optional)
1. Run `pnpm exec web-push generate-vapid-keys`, then set `NEXT_PUBLIC_VAPID_PUBLIC_KEY` on the web host.
2. Deploy the function: `pnpm exec supabase functions deploy push-dispatch --no-verify-jwt`.
3. Run `supabase secrets set VAPID_PUBLIC_KEY=… VAPID_PRIVATE_KEY=… VAPID_SUBJECT=mailto:… PUSH_DISPATCH_SECRET=<random>`.
4. Store the two Vault secrets used by the cron job:
   ```sql
   select vault.create_secret('https://<ref>.supabase.co', 'project_url');
   select vault.create_secret('<same random secret>', 'push_dispatch_secret');
   ```
In-app notifications work without any of this. Push is an additional channel.

### 4. Face verification (AWS Rekognition)
A profile is **invisible to everyone else until the user passes face verification**. Unverified users can only browse
Discover (no likes, no matches, no connections). The flow:

1. **Cover photo check** — `DetectFaces`: exactly one clear face (confidence, size, sharpness, brightness).
2. **Live selfie** — AWS **Face Liveness** in the browser (`@aws-amplify/ui-react-liveness`), which rejects photos,
   screens, masks and video injection. The browser gets 15-minute STS credentials limited to
   `rekognition:StartFaceLivenessSession`; long-lived keys never leave the server.
3. **Face match** — `CompareFaces` between the liveness reference image and the cover photo (default ≥ 90% similarity).
4. Pass → `profiles.verification = 'verified'` + `verified_photo_id`; the profile becomes visible.
   Deleting the verified photo automatically removes the verification.

**Every later photo is checked automatically** against the verified photo (`DetectFaces` + `CompareFaces`, no new selfie):

| `profile_photos.face_status` | Meaning | Shown to others | Can be cover |
| --- | --- | --- | --- |
| `solo` | only the user, clear | ✅ | ✅ |
| `with_others` | the user with other people | ✅ | ❌ |
| `unclear` | the user, but blurry / small / dark | ✅ | ❌ |
| `no_face` | places, food, pets | ✅ | ❌ |
| `reviewed` | approved by a moderator (manual path) | ✅ | ❌ |
| `mismatch` | someone else — rejected and deleted on upload | ❌ | ❌ |
| `unchecked` | not checked yet (e.g. service unavailable) | ❌ | ❌ |

A profile is visible only if it is verified **and its cover is `solo`** (enforced in SQL by `private.cover_is_solo`).
Users cannot set `face_status` (column-level grants). If the verified photo is deleted, verification moves to another
`solo` photo; only when none is left does the user need a new live selfie. Photos uploaded before verification are
checked in bulk right after the live selfie succeeds.

No biometric data is stored: only outcome and scores (`face_verifications`, `profile_photos.face_similarity`). Separate explicit consent (`consents.kind =
'biometric'`) is recorded first. Max 5 attempts/day. If automatic verification is unavailable, users can request a
**manual review** (Admin → Verifications).

Setup:
1. In IAM create a role (e.g. `OneRomeLivenessBrowser`) with an inline policy allowing
   `rekognition:StartFaceLivenessSession`, trusted by the server IAM user. Set `AWS_LIVENESS_ROLE_ARN`.
2. Create an IAM user for the server with `rekognition:CreateFaceLivenessSession`, `rekognition:GetFaceLivenessSessionResults`,
   `rekognition:CompareFaces`, `rekognition:DetectFaces` and `sts:AssumeRole` on the role above. Set `AWS_ACCESS_KEY_ID`
   and `AWS_SECRET_ACCESS_KEY` (server only).
3. Set `AWS_REKOGNITION_REGION` to an EU region that supports Face Liveness (e.g. `eu-west-1`).
4. Sign a DPA with AWS and update the privacy policy/DPIA (biometric processing requires a DPIA under GDPR art. 35).

### 5. Venue bookings
Venues are managed from **Admin → Venues**. A First Date booking is only ever a *request* (`booking_requests`)
until an admin or venue confirms it in **Admin → Bookings**. Discounts can only be set on venues marked as
partners, which requires a real agreement.

---

## Status of external integrations

| Integration | Status |
| --- | --- |
| Supabase Auth / DB / Storage / Realtime / Cron | Implemented and tested locally |
| Stripe Checkout, Portal, Webhook | Implemented; webhook covered by unit tests. **Needs real test-mode keys to verify end-to-end** |
| Face verification (AWS Rekognition) | Implemented; decision logic and server flow covered by tests with AWS mocked. **Needs AWS keys to verify end-to-end** |
| Web Push (Edge Function) | Implemented; **needs VAPID keys and deployment** to verify |
| Venue booking system | Admin-confirmed requests only; no external booking API connected |
| Legal texts (privacy, terms) | **Drafts**: must be reviewed by a qualified lawyer before launch |

---

## Security & privacy notes
- Secrets are read only in server modules (`server-only`). The service role is used only by the Stripe webhook,
  account deletion and verification-selfie cleanup.
- Input is validated with zod on the server. Errors reach clients as stable codes, translated in the UI.
- Logs go through `src/lib/logger.ts`, which redacts PII-like keys.
- Rate limits (likes per day, messages per minute, reports per day) are enforced inside the database.
- Photos are re-encoded in the browser before upload, which strips EXIF/GPS. Buckets are private, with short-lived signed URLs.
- GDPR: explicit consent for sensitive preferences, JSON data export, full account deletion (Stripe subscriptions
  cancelled, files removed, cascading delete), retention jobs for closed chats and notifications.
