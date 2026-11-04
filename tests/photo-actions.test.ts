import { beforeEach, describe, expect, it, vi } from "vitest";

const state = {
  verification: "verified",
  photos: [] as { id: string; face_status: string }[],
  removedFiles: [] as string[],
  deletedRows: [] as string[],
  updates: [] as { id: string; position: number }[],
};
const check = vi.fn();

function userClient() {
  return {
    auth: { getClaims: async () => ({ data: { claims: { sub: "11111111-1111-1111-1111-111111111111" } } }) },
    storage: { from: () => ({ remove: async (p: string[]) => (state.removedFiles.push(...p), {}), createSignedUrl: async () => ({ data: { signedUrl: "https://signed" } }) }) },
    from(table: string) {
      const f: Record<string, unknown> = {};
      const api: Record<string, unknown> = {
        select: (_s: string, o?: { head?: boolean }) => ((f.head = o?.head), api),
        eq: (k: string, v: unknown) => ((f[k] = v), api),
        insert: () => ({ select: () => ({ single: async () => ({ data: { id: "photo-new" }, error: null }) }) }),
        update: (patch: { position: number }) => ({ eq: (_k: string, id: string) => ({ eq: async () => (state.updates.push({ id, position: patch.position }), { error: null }) }) }),
        single: async () => ({ data: table === "profiles" ? { verification: state.verification } : null }),
        maybeSingle: async () => ({ data: state.photos.find((p) => p.id === f.id) ?? null }),
        then: (r: (v: unknown) => void) => r({ count: state.photos.length }),
      };
      return api;
    },
  };
}

vi.mock("@/lib/supabase/server", () => ({ createClient: async () => userClient() }));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: () => ({ delete: () => ({ eq: async (_k: string, id: string) => (state.deletedRows.push(id), {}) }) }),
    storage: { from: () => ({ remove: async (p: string[]) => (state.removedFiles.push(...p), {}) }) },
  }),
}));
vi.mock("@/lib/face/photo-check", () => ({ checkPhotoAgainstVerifiedFace: (...a: unknown[]) => check(...a) }));
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));

const { addPhotoAction, reorderPhotosAction } = await import("@/server/actions/photos");
const PATH = "11111111-1111-1111-1111-111111111111/22222222-2222-2222-2222-222222222222.webp";
const A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

beforeEach(() => {
  state.verification = "verified";
  state.photos = [{ id: A, face_status: "solo" }, { id: B, face_status: "no_face" }];
  state.removedFiles = [];
  state.deletedRows = [];
  state.updates = [];
  check.mockReset();
});

describe("photo upload checks (verified users)", () => {
  it("rejects and deletes a photo of someone else", async () => {
    check.mockResolvedValue("mismatch");
    expect(await addPhotoAction(PATH)).toEqual({ ok: false, error: "photo_not_you" });
    expect(state.deletedRows).toContain("photo-new");
    expect(state.removedFiles).toContain(PATH);
  });

  it("accepts photos of the user and reports their status", async () => {
    check.mockResolvedValue("with_others");
    expect(await addPhotoAction(PATH)).toEqual({ ok: true, data: { id: "photo-new", url: "https://signed", status: "with_others" } });
  });

  it("does not check photos before verification (they are checked after the live selfie)", async () => {
    state.verification = "unverified";
    const res = await addPhotoAction(PATH);
    expect(check).not.toHaveBeenCalled();
    expect(res).toMatchObject({ ok: true, data: { status: "unchecked" } });
  });
});

describe("cover rule", () => {
  it("refuses a cover that does not show the user alone", async () => {
    expect(await reorderPhotosAction([B, A])).toEqual({ ok: false, error: "cover_must_be_you" });
    expect(state.updates).toHaveLength(0);
  });

  it("allows a solo photo as cover", async () => {
    expect(await reorderPhotosAction([A, B])).toEqual({ ok: true, data: undefined });
    expect(state.updates).toEqual([{ id: A, position: 0 }, { id: B, position: 1 }]);
  });

  it("does not restrict the order before verification", async () => {
    state.verification = "unverified";
    expect((await reorderPhotosAction([B, A])).ok).toBe(true);
  });
});
