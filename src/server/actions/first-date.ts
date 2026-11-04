"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { fail, ok, toErrorCode, type ActionResult } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";

const conn = z.uuid();

async function call(fn: () => PromiseLike<{ error: unknown }>): Promise<ActionResult> {
  const { error } = await fn();
  if (error) return fail(toErrorCode(error));
  revalidatePath("/[locale]/first-date", "page");
  return ok();
}

export async function firstDateOptInAction(connectionId: unknown) {
  const parsed = conn.safeParse(connectionId);
  if (!parsed.success) return fail("not_participant");
  const supabase = await createClient();
  return call(() => supabase.rpc("first_date_opt_in", { p_connection: parsed.data }));
}

export async function firstDateProposeAction(input: unknown) {
  const parsed = z.object({ connectionId: z.uuid(), venueId: z.uuid(), scheduledFor: z.iso.datetime({ offset: true }) }).safeParse(input);
  if (!parsed.success) return fail("invalid_date_time");
  const supabase = await createClient();
  return call(() =>
    supabase.rpc("first_date_propose", { p_connection: parsed.data.connectionId, p_venue: parsed.data.venueId, p_scheduled_for: parsed.data.scheduledFor }),
  );
}

export async function firstDateConfirmAction(connectionId: unknown) {
  const parsed = conn.safeParse(connectionId);
  if (!parsed.success) return fail("not_participant");
  const supabase = await createClient();
  return call(() => supabase.rpc("first_date_confirm", { p_connection: parsed.data }));
}

export async function firstDateCancelAction(connectionId: unknown) {
  const parsed = conn.safeParse(connectionId);
  if (!parsed.success) return fail("not_participant");
  const supabase = await createClient();
  return call(() => supabase.rpc("first_date_cancel", { p_connection: parsed.data }));
}
