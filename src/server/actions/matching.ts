"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { fail, ok, toErrorCode, type ActionResult } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";

const id = z.uuid();

export async function likeAction(target: unknown): Promise<ActionResult<{ status: "liked" | "matched"; matchId?: string }>> {
  const parsed = id.safeParse(target);
  if (!parsed.success) return fail("invalid_target");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("like_profile", { p_target: parsed.data });
  if (error) return fail(toErrorCode(error));
  const result = data as { status: "liked" | "matched"; match_id?: string };
  if (result.status === "matched") revalidatePath("/[locale]/likes", "page");
  return ok({ status: result.status, matchId: result.match_id });
}

export async function passAction(target: unknown): Promise<ActionResult> {
  const parsed = id.safeParse(target);
  if (!parsed.success) return fail("invalid_target");
  const supabase = await createClient();
  const { error } = await supabase.rpc("pass_profile", { p_target: parsed.data });
  return error ? fail(toErrorCode(error)) : ok();
}

export async function startConnectionAction(matchId: unknown): Promise<ActionResult<{ connectionId: string }>> {
  const parsed = id.safeParse(matchId);
  if (!parsed.success) return fail("match_not_found");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("start_connection", { p_match_id: parsed.data });
  if (error) return fail(toErrorCode(error));
  revalidatePath("/[locale]", "layout");
  return ok({ connectionId: data as string });
}

export async function endConnectionAction(connectionId: unknown): Promise<ActionResult> {
  const parsed = id.safeParse(connectionId);
  if (!parsed.success) return fail("not_participant");
  const supabase = await createClient();
  const { error } = await supabase.rpc("end_connection", { p_connection: parsed.data });
  if (error) return fail(toErrorCode(error));
  revalidatePath("/[locale]", "layout");
  return ok();
}

export async function blockAction(target: unknown): Promise<ActionResult> {
  const parsed = id.safeParse(target);
  if (!parsed.success) return fail("invalid_target");
  const supabase = await createClient();
  const { error } = await supabase.rpc("block_user", { p_target: parsed.data });
  if (error) return fail(toErrorCode(error));
  revalidatePath("/[locale]", "layout");
  return ok();
}

export async function unblockAction(target: unknown): Promise<ActionResult> {
  const parsed = id.safeParse(target);
  if (!parsed.success) return fail("invalid_target");
  const supabase = await createClient();
  const { error } = await supabase.rpc("unblock_user", { p_target: parsed.data });
  if (error) return fail(toErrorCode(error));
  revalidatePath("/[locale]/safety", "page");
  return ok();
}

const reportSchema = z.object({
  target: z.uuid(),
  reason: z.enum(["spam", "fake_profile", "harassment", "inappropriate_content", "underage", "scam", "other"]),
  details: z.string().trim().max(1000).optional(),
  messageId: z.uuid().optional(),
  block: z.boolean().default(false),
});

export async function reportAction(input: unknown): Promise<ActionResult> {
  const parsed = reportSchema.safeParse(input);
  if (!parsed.success) return fail("invalid_input");
  const supabase = await createClient();
  const { error } = await supabase.rpc("report_user", {
    p_target: parsed.data.target,
    p_reason: parsed.data.reason,
    p_details: parsed.data.details || undefined,
    p_message_id: parsed.data.messageId,
    p_block: parsed.data.block,
  });
  if (error) return fail(toErrorCode(error));
  revalidatePath("/[locale]", "layout");
  return ok();
}
