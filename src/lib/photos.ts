import "server-only";
import type { ServerSupabase } from "@/lib/supabase/server";

const BUCKET = "profile-photos";
const TTL = 60 * 60; // 1 hour

/**
 * Creates short-lived signed URLs for private profile photos. Storage RLS
 * decides whether the current user may see each photo.
 */
export async function signPhotoPaths(supabase: ServerSupabase, paths: string[]): Promise<Record<string, string>> {
  const unique = [...new Set(paths.filter(Boolean))];
  if (unique.length === 0) return {};
  const { data } = await supabase.storage.from(BUCKET).createSignedUrls(unique, TTL);
  const map: Record<string, string> = {};
  for (const item of data ?? []) {
    if (item.path && item.signedUrl) map[item.path] = item.signedUrl;
  }
  return map;
}
