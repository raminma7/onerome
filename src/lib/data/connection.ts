import "server-only";
import type { ServerSupabase } from "@/lib/supabase/server";

export async function getActiveConnection(supabase: ServerSupabase) {
  const { data } = await supabase.rpc("get_active_connection");
  return data?.[0] ?? null;
}

export async function getConfigNumber(supabase: ServerSupabase, key: string, fallback: number) {
  const { data } = await supabase.from("app_config").select("value").eq("key", key).maybeSingle();
  const n = Number(data?.value);
  return Number.isFinite(n) ? n : fallback;
}
