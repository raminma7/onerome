import "server-only";
import {
  CompareFacesCommand, CreateFaceLivenessSessionCommand, DetectFacesCommand, GetFaceLivenessSessionResultsCommand, RekognitionClient,
} from "@aws-sdk/client-rekognition";
import { AssumeRoleCommand, STSClient } from "@aws-sdk/client-sts";
import { DEFAULT_THRESHOLDS, type DetectedFace, type Thresholds } from "./decision";

/**
 * AWS configuration. Credentials for the server are read by the SDK from the
 * standard environment variables (AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY).
 * The browser never receives these: it gets 15-minute STS credentials that can
 * only call rekognition:StartFaceLivenessSession.
 */
export const faceConfig = {
  region: process.env.AWS_REKOGNITION_REGION ?? process.env.AWS_REGION ?? "eu-west-1",
  livenessRoleArn: process.env.AWS_LIVENESS_ROLE_ARN ?? "",
  hasServerCredentials: Boolean(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY),
};

export const isFaceVerificationConfigured = Boolean(faceConfig.livenessRoleArn && faceConfig.hasServerCredentials);

export function thresholds(): Thresholds {
  const n = (v: string | undefined, d: number) => (v && Number.isFinite(Number(v)) ? Number(v) : d);
  return {
    ...DEFAULT_THRESHOLDS,
    minLivenessConfidence: n(process.env.FACE_LIVENESS_MIN_CONFIDENCE, DEFAULT_THRESHOLDS.minLivenessConfidence),
    minSimilarity: n(process.env.FACE_MATCH_MIN_SIMILARITY, DEFAULT_THRESHOLDS.minSimilarity),
  };
}

let rekognition: RekognitionClient | null = null;
let sts: STSClient | null = null;
const rk = () => (rekognition ??= new RekognitionClient({ region: faceConfig.region }));
const st = () => (sts ??= new STSClient({ region: faceConfig.region }));

export async function detectFaces(image: Uint8Array): Promise<DetectedFace[]> {
  const res = await rk().send(new DetectFacesCommand({ Image: { Bytes: image }, Attributes: ["DEFAULT"] }));
  return (res.FaceDetails ?? []).map((f) => ({
    confidence: f.Confidence,
    boundingBox: { width: f.BoundingBox?.Width, height: f.BoundingBox?.Height },
    quality: { sharpness: f.Quality?.Sharpness, brightness: f.Quality?.Brightness },
  }));
}

export async function createLivenessSession(clientRequestToken: string): Promise<string> {
  // AuditImagesLimit 0: AWS keeps no extra frames; only the reference image is returned once.
  const res = await rk().send(new CreateFaceLivenessSessionCommand({ ClientRequestToken: clientRequestToken, Settings: { AuditImagesLimit: 0 } }));
  if (!res.SessionId) throw new Error("No liveness session id");
  return res.SessionId;
}

export async function getLivenessResult(sessionId: string) {
  const res = await rk().send(new GetFaceLivenessSessionResultsCommand({ SessionId: sessionId }));
  return { status: res.Status ?? "FAILED", confidence: res.Confidence, referenceImage: res.ReferenceImage?.Bytes };
}

export async function compareFaces(source: Uint8Array, target: Uint8Array): Promise<number | undefined> {
  const res = await rk().send(new CompareFacesCommand({ SourceImage: { Bytes: source }, TargetImage: { Bytes: target }, SimilarityThreshold: 0 }));
  return Math.max(0, ...(res.FaceMatches ?? []).map((m) => m.Similarity ?? 0));
}

/** Short-lived browser credentials restricted to streaming one liveness session. */
export async function livenessBrowserCredentials(userId: string) {
  const res = await st().send(
    new AssumeRoleCommand({
      RoleArn: faceConfig.livenessRoleArn,
      RoleSessionName: `onerome-liveness-${userId.slice(0, 8)}`,
      DurationSeconds: 900,
      Policy: JSON.stringify({
        Version: "2012-10-17",
        Statement: [{ Effect: "Allow", Action: "rekognition:StartFaceLivenessSession", Resource: "*" }],
      }),
    }),
  );
  const c = res.Credentials;
  if (!c?.AccessKeyId || !c.SecretAccessKey) throw new Error("No STS credentials");
  return { accessKeyId: c.AccessKeyId, secretAccessKey: c.SecretAccessKey, sessionToken: c.SessionToken, expiration: c.Expiration?.toISOString() };
}
