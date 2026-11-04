import { describe, expect, it } from "vitest";
import { evaluateLiveness, evaluateMatch, evaluatePhoto } from "./decision";

const clearFace = { confidence: 99.9, boundingBox: { width: 0.4, height: 0.45 }, quality: { sharpness: 80, brightness: 60 } };

describe("evaluatePhoto", () => {
  it("accepts one clear, large face", () => {
    expect(evaluatePhoto([clearFace])).toEqual({ ok: true });
  });
  it("rejects photos without a face", () => {
    expect(evaluatePhoto([])).toEqual({ ok: false, reason: "photo_no_face" });
    expect(evaluatePhoto([{ ...clearFace, confidence: 40 }])).toEqual({ ok: false, reason: "photo_no_face" });
  });
  it("rejects group photos", () => {
    expect(evaluatePhoto([clearFace, { ...clearFace }])).toEqual({ ok: false, reason: "photo_multiple_faces" });
  });
  it("ignores tiny background faces", () => {
    const tiny = { confidence: 99, boundingBox: { width: 0.03, height: 0.03 }, quality: { sharpness: 50, brightness: 50 } };
    expect(evaluatePhoto([clearFace, tiny])).toEqual({ ok: true });
  });
  it("rejects blurry, dark, overexposed or distant faces", () => {
    expect(evaluatePhoto([{ ...clearFace, quality: { sharpness: 5, brightness: 60 } }])).toEqual({ ok: false, reason: "photo_unclear" });
    expect(evaluatePhoto([{ ...clearFace, quality: { sharpness: 80, brightness: 8 } }])).toEqual({ ok: false, reason: "photo_unclear" });
    expect(evaluatePhoto([{ ...clearFace, quality: { sharpness: 80, brightness: 99 } }])).toEqual({ ok: false, reason: "photo_unclear" });
    expect(evaluatePhoto([{ ...clearFace, boundingBox: { width: 0.15, height: 0.15 } }])).toEqual({ ok: false, reason: "photo_unclear" });
  });
});

describe("evaluateLiveness", () => {
  it("requires a succeeded session, a reference image and enough confidence", () => {
    expect(evaluateLiveness({ status: "SUCCEEDED", confidence: 97, hasReferenceImage: true })).toEqual({ ok: true });
    expect(evaluateLiveness({ status: "SUCCEEDED", confidence: 40, hasReferenceImage: true }).ok).toBe(false);
    expect(evaluateLiveness({ status: "FAILED", confidence: 99, hasReferenceImage: true }).ok).toBe(false);
    expect(evaluateLiveness({ status: "EXPIRED", hasReferenceImage: false }).ok).toBe(false);
    expect(evaluateLiveness({ status: "SUCCEEDED", confidence: 99, hasReferenceImage: false }).ok).toBe(false);
  });
});

describe("evaluateMatch", () => {
  it("requires a high similarity", () => {
    expect(evaluateMatch(98.5)).toEqual({ ok: true });
    expect(evaluateMatch(72)).toEqual({ ok: false, reason: "face_mismatch" });
    expect(evaluateMatch(undefined)).toEqual({ ok: false, reason: "face_mismatch" });
  });
});

import { canBeCover, decidePhotoStatus } from "./decision";

describe("decidePhotoStatus", () => {
  const tiny = { confidence: 99, boundingBox: { width: 0.03, height: 0.03 }, quality: { sharpness: 50, brightness: 50 } };
  it("classifies photos against the verified face", () => {
    expect(decidePhotoStatus([clearFace], 97)).toBe("solo");
    expect(decidePhotoStatus([clearFace, { ...clearFace }], 95)).toBe("with_others");
    expect(decidePhotoStatus([{ ...clearFace, quality: { sharpness: 4, brightness: 50 } }], 93)).toBe("unclear");
    expect(decidePhotoStatus([], undefined)).toBe("no_face");
    expect(decidePhotoStatus([tiny], 99)).toBe("no_face");
    expect(decidePhotoStatus([clearFace], 35)).toBe("mismatch");
    expect(decidePhotoStatus([clearFace, { ...clearFace }], 20)).toBe("mismatch");
  });
  it("only solo photos can be the cover", () => {
    expect(canBeCover("solo")).toBe(true);
    for (const s of ["with_others", "unclear", "no_face", "reviewed", "mismatch", "unchecked", null]) expect(canBeCover(s)).toBe(false);
  });
});
