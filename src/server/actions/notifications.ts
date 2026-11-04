"use server";
import { z } from "zod";
import { fail, ok, toErrorCode, type ActionResult } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";

async function session() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  return { supabase, userId: (data?.claims?.sub as string | undefined) ?? null };
}

export async function markAllNotificationsReadAction(): Promise<ActionResult> {
  const { supabase, userId } = await session();
  if (!userId) return fail("not_authenticated");
  const { error } = await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("user_id", userId).is("read_at", null);
  return error ? fail(toErrorCode(error)) : ok();
}

const pushSchema = z.object({
  endpoint: z.url().max(1000),
  keys: z.object({ p256dh: z.string().max(200), auth: z.string().max(100) }),
  userAgent: z.string().max(300).optional(),
});

export async function savePushSubscriptionAction(input: unknown): Promise<ActionResult> {
  const parsed = pushSchema.safeParse(input);
  if (!parsed.success) return fail("invalid_input");
  const { supabase, userId } = await session();
  if (!userId) return fail("not_authenticated");
  const { error } = await supabase.from("push_subscriptions").upsert(
    { user_id: userId, endpoint: parsed.data.endpoint, p256dh: parsed.data.keys.p256dh, auth: parsed.data.keys.auth, user_agent: parsed.data.userAgent },
    { onConflict: "endpoint" },
  );
  return error ? fail(toErrorCode(error)) : ok();
}

export async function deletePushSubscriptionAction(endpoint: unknown): Promise<ActionResult> {
  const parsed = z.string().max(1000).safeParse(endpoint);
  if (!parsed.success) return fail("invalid_input");
  const { supabase } = await session();
  await supabase.from("push_subscriptions").delete().eq("endpoint", parsed.data);
  return ok();
}
