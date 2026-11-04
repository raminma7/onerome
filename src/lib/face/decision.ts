/**
 * Pure decision rules for face verification (no AWS calls here, fully unit-tested).
 *
 * 1. The cover photo must contain exactly ONE clear, sufficiently large face.
 * 2. The live selfie must pass AWS Face Liveness with enough confidence.
 * 3. The live selfie must match the cover photo (CompareFaces similarity).
 */
export type FaceVerificationFailure =
  | "photo_no_face"
  | "photo_multiple_faces"
  | "photo_unclear"
  | "liveness_failed"
  | "face_mismatch";

export interface Thresholds {
  minLivenessConfidence: number; // 0-100
  minSimilarity: number; // 0-100
  minFaceConfidence: number; // 0-100
  minFaceArea: number; // fraction of the image (0-1)
  minSharpness: number; // 0-100 (Rekognition Quality.Sharpness)
  minBrightness: number; // 0-100
  maxBrightness: number; // 0-100
}

export const DEFAULT_THRESHOLDS: Thresholds = {
  minLivenessConfidence: 80,
  minSimilarity: 90,
  minFaceConfidence: 95,
  minFaceArea: 0.04,
  minSharpness: 15,
  minBrightness: 20,
  maxBrightness: 97,
};

export interface DetectedFace {
  confidence?: number;
  boundingBox?: { width?: number; height?: number };
  quality?: { sharpness?: number; brightness?: number };
}

/** Faces too small or uncertain (background people, posters) are ignored when counting. */
function significant(face: DetectedFace, t: Thresholds) {
  const area = (face.boundingBox?.width ?? 0) * (face.boundingBox?.height ?? 0);
  return (face.confidence ?? 0) >= t.minFaceConfidence && area >= t.minFaceArea / 4;
}

export function evaluatePhoto(faces: DetectedFace[], t: Thresholds = DEFAULT_THRESHOLDS): { ok: true } | { ok: false; reason: FaceVerificationFailure } {
  const real = faces.filter((f) => significant(f, t));
  if (real.length === 0) return { ok: false, reason: "photo_no_face" };
  if (real.length > 1) return { ok: false, reason: "photo_multiple_faces" };
  const face = real[0];
  const area = (face.boundingBox?.width ?? 0) * (face.boundingBox?.height ?? 0);
  const sharpness = face.quality?.sharpness ?? 0;
  const brightness = face.quality?.brightness ?? 0;
  if (area < t.minFaceArea || sharpness < t.minSharpness || brightness < t.minBrightness || brightness > t.maxBrightness) {
    return { ok: false, reason: "photo_unclear" };
  }
  return { ok: true };
}

export interface LivenessOutcome {
  status: string; // CREATED | IN_PROGRESS | SUCCEEDED | FAILED | EXPIRED
  confidence?: number;
  hasReferenceImage: boolean;
}

export function evaluateLiveness(l: LivenessOutcome, t: Thresholds = DEFAULT_THRESHOLDS): { ok: true } | { ok: false; reason: FaceVerificationFailure } {
  if (l.status !== "SUCCEEDED" || !l.hasReferenceImage || (l.confidence ?? 0) < t.minLivenessConfidence) {
    return { ok: false, reason: "liveness_failed" };
  }
  return { ok: true };
}

export function evaluateMatch(similarity: number | undefined, t: Thresholds = DEFAULT_THRESHOLDS): { ok: true } | { ok: false; reason: FaceVerificationFailure } {
  return (similarity ?? 0) >= t.minSimilarity ? { ok: true } : { ok: false, reason: "face_mismatch" };
}
