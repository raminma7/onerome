import "server-only";
import { signPhotoPaths } from "@/lib/photos";
import type { ServerSupabase } from "@/lib/supabase/server";
import type { Tables } from "@/lib/supabase/database.types";

export type PublicProfile = Omit<Tables<"public_profiles">, "photo_paths"> & { photos: string[] };

/** Loads public profiles (RLS-filtered view) with signed photo URLs, keyed by id. */
export async function getPublicProfiles(supabase: ServerSupabase, ids: string[]): Promise<Record<string, PublicProfile>> {
  const unique = [...new Set(ids.filter(Boolean))];
  if (unique.length === 0) return {};
  const { data } = await supabase.from("public_profiles").select("*").in("id", unique);
  const rows = data ?? [];
  const urls = await signPhotoPaths(supabase, rows.flatMap((r) => r.photo_paths ?? []));
  return Object.fromEntries(
    rows.map((r) => {
      const { photo_paths, ...rest } = r;
      return [r.id!, { ...rest, photos: (photo_paths ?? []).map((p) => urls[p]).filter(Boolean) }];
    }),
  );
}
