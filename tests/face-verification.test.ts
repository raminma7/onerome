import { beforeEach, describe, expect, it, vi } from "vitest";

// ---- in-memory fakes --------------------------------------------------------
type Row = Record<string, unknown>;
const db: { profiles: Row[]; photos: Row[]; verifications: Row[]; notifications: Row[]; consents: Row[] } = {
  profiles: [], photos: [], verifications: [], notifications: [], consents: [],
};
const aws = {
  detectFaces: vi.fn(),
  createLivenessSession: vi.fn(),
  getLivenessResult: vi.fn(),
  compareFaces: vi.fn(),
};

function table(name: string): Row[] {
  return ({ profiles: db.profiles, profile_photos: db.photos, face_verifications: db.verifications, notifications: db.notifications, consents: db.consents } as Record<string, Row[]>)[name] ?? [];
}

function query(name: string) {
  const filters: [string, string, unknown][] = [];
  let pendingUpdate: Row | null = null;
  let countMode = false;
  const rows = () => table(name).filter((r) => filters.every(([op, k, v]) => (op === "eq" ? r[k] === v : String(r[k]) >= String(v))));
  const api: Record<string, unknown> = {
    select: (_: string, opts?: { count?: string; head?: boolean }) => { countMode = Boolean(opts?.head); return api; },
    eq: (k: string, v: unknown) => (filters.push(["eq", k, v]), api),
    gte: (k: string, v: unknown) => (filters.push(["gte", k, v]), api),
    order: () => api,
    limit: () => api,
    single: async () => ({ data: rows()[0] ?? null, error: rows()[0] ? null : { message: "none" } }),
    maybeSingle: async () => {
      if (pendingUpdate) { rows().forEach((r) => Object.assign(r, pendingUpdate)); return { error: null }; }
      return { data: rows()[0] ?? null };
    },
    insert: (row: Row) => {
      const r = { id: `id-${Math.random().toString(36).slice(2)}`, created_at: new Date().toISOString(), ...row };
      table(name).push(r);
      const res = { error: null, data: r };
      return Object.assign(Promise.resolve(res), { select: () => ({ single: async () => res }) });
    },
    update: (patch: Row) => {
      pendingUpdate = patch;
      const apply = { eq: (k: string, v: unknown) => { table(name).filter((r) => r[k] === v).forEach((r) => Object.assign(r, patch)); return Promise.resolve({ error: null }); } };
      return apply;
    },
    then: (resolve: (v: unknown) => void) => resolve(countMode ? { count: rows().length } : { data: rows() }),
  };
  return api;
}

const storage = { from: () => ({ download: async () => ({ data: new Blob([new Uint8Array([1, 2, 3])]) }) }) };

vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({ from: query, storage }) }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ from: query, auth: { getClaims: async () => ({ data: { claims: { sub: "user-1" } } }) } }),
}));
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));
vi.mock("@/lib/face/aws", async () => {
  const d = await import("@/lib/face/decision");
  return {
    faceConfig: { region: "eu-west-1" },
    isFaceVerificationConfigured: true,
    thresholds: () => d.DEFAULT_THRESHOLDS,
    livenessBrowserCredentials: async () => ({ accessKeyId: "AK", secretAccessKey: "SK" }),
    ...aws,
  };
});

const { startFaceVerificationAction, completeFaceVerificationAction } = await import("@/server/actions/verification");

const clearFace = { confidence: 99.9, boundingBox: { width: 0.4, height: 0.45 }, quality: { sharpness: 80, brightness: 60 } };

beforeEach(() => {
  db.profiles = [{ id: "user-1", verification: "unverified", onboarding_completed_at: "2026-01-01", suspended_at: null }];
  db.photos = [{ id: "photo-1", user_id: "user-1", storage_path: "user-1/a.webp" }];
  db.verifications = [];
  db.notifications = [];
  db.consents = [];
  Object.values(aws).forEach((f) => f.mockReset());
  aws.createLivenessSession.mockResolvedValue("session-0000000001");
});

describe("face verification flow", () => {
  it("requires explicit biometric consent", async () => {
    expect(await startFaceVerificationAction({ consent: false })).toEqual({ ok: false, error: "consent_required" });
  });

  it("rejects an unclear cover photo before starting liveness", async () => {
    aws.detectFaces.mockResolvedValue([clearFace, { ...clearFace }]);
    expect(await startFaceVerificationAction({ consent: true })).toEqual({ ok: false, error: "photo_multiple_faces" });
    expect(aws.createLivenessSession).not.toHaveBeenCalled();
    expect(db.consents).toHaveLength(1);
  });

  it("verifies the profile when liveness and face match pass", async () => {
    aws.detectFaces.mockResolvedValue([clearFace]);
    const start = await startFaceVerificationAction({ consent: true });
    expect(start).toEqual({ ok: true, data: { sessionId: "session-0000000001", region: "eu-west-1" } });

    aws.getLivenessResult.mockResolvedValue({ status: "SUCCEEDED", confidence: 99, referenceImage: new Uint8Array([9]) });
    aws.compareFaces.mockResolvedValue(98.7);
    expect(await completeFaceVerificationAction("session-0000000001")).toEqual({ ok: true, data: { verified: true } });

    expect(db.profiles[0]).toMatchObject({ verification: "verified", verified_photo_id: "photo-1" });
    expect(db.photos[0]).toMatchObject({ face_status: "solo", face_similarity: 98.7 });
    expect(db.verifications[0]).toMatchObject({ status: "passed", similarity: 98.7, liveness_confidence: 99 });
    expect(db.notifications[0]).toMatchObject({ type: "verification_status" });
  });

  it("keeps the profile hidden when the selfie does not match the photo", async () => {
    aws.detectFaces.mockResolvedValue([clearFace]);
    await startFaceVerificationAction({ consent: true });
    aws.getLivenessResult.mockResolvedValue({ status: "SUCCEEDED", confidence: 99, referenceImage: new Uint8Array([9]) });
    aws.compareFaces.mockResolvedValue(41);
    expect(await completeFaceVerificationAction("session-0000000001")).toEqual({ ok: false, error: "face_mismatch" });
    expect(db.profiles[0].verification).toBe("unverified");
    expect(db.verifications[0]).toMatchObject({ status: "failed", failure_reason: "face_mismatch" });
  });

  it("rejects spoofed / failed liveness without comparing faces", async () => {
    aws.detectFaces.mockResolvedValue([clearFace]);
    await startFaceVerificationAction({ consent: true });
    aws.getLivenessResult.mockResolvedValue({ status: "SUCCEEDED", confidence: 12, referenceImage: new Uint8Array([9]) });
    expect(await completeFaceVerificationAction("session-0000000001")).toEqual({ ok: false, error: "liveness_failed" });
    expect(aws.compareFaces).not.toHaveBeenCalled();
    expect(db.profiles[0].verification).toBe("unverified");
  });

  it("cannot complete a session twice or someone else's session", async () => {
    aws.detectFaces.mockResolvedValue([clearFace]);
    await startFaceVerificationAction({ consent: true });
    aws.getLivenessResult.mockResolvedValue({ status: "SUCCEEDED", confidence: 99, referenceImage: new Uint8Array([9]) });
    aws.compareFaces.mockResolvedValue(99);
    await completeFaceVerificationAction("session-0000000001");
    expect(await completeFaceVerificationAction("session-0000000001")).toEqual({ ok: false, error: "verification_session_invalid" });
    expect(await completeFaceVerificationAction("session-of-another-user")).toEqual({ ok: false, error: "verification_session_invalid" });
  });

  it("limits the number of attempts per day", async () => {
    aws.detectFaces.mockResolvedValue([]);
    for (let i = 0; i < 5; i++) await startFaceVerificationAction({ consent: true });
    expect(await startFaceVerificationAction({ consent: true })).toEqual({ ok: false, error: "rate_limited" });
  });
});
