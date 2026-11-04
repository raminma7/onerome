"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { fail, ok, toErrorCode, type ActionResult } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";
import { VENUE_CATEGORIES } from "@/lib/domain/options";

/** All admin actions go through admin-only RPCs/RLS; the database re-checks the role and audits. */
async function done(error: unknown): Promise<ActionResult> {
  if (error) return fail(toErrorCode(error));
  revalidatePath("/[locale]/admin", "layout");
  return ok();
}

export async function adminSuspendAction(input: unknown) {
  const p = z.object({ userId: z.uuid(), suspend: z.boolean(), reason: z.string().max(500).optional() }).safeParse(input);
  if (!p.success) return fail("invalid_input");
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_set_suspension", { p_user: p.data.userId, p_suspend: p.data.suspend, p_reason: p.data.reason });
  return done(error);
}

export async function adminReportEvidenceAction(reportId: unknown): Promise<ActionResult<{ message: string | null }>> {
  const p = z.uuid().safeParse(reportId);
  if (!p.success) return fail("invalid_input");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_get_report_evidence", { p_report: p.data });
  if (error) return fail(toErrorCode(error));
  return ok({ message: (data as { message: string | null }).message });
}

export async function adminResolveReportAction(input: unknown) {
  const p = z.object({ reportId: z.uuid(), status: z.enum(["actioned", "dismissed", "reviewing"]), note: z.string().max(1000).optional() }).safeParse(input);
  if (!p.success) return fail("invalid_input");
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_resolve_report", { p_report: p.data.reportId, p_status: p.data.status, p_note: p.data.note });
  return done(error);
}

export async function adminReviewVerificationAction(input: unknown) {
  const p = z.object({ requestId: z.uuid(), approve: z.boolean() }).safeParse(input);
  if (!p.success) return fail("invalid_input");
  const supabase = await createClient();
  const { data: req } = await supabase.from("verification_requests").select("storage_path").eq("id", p.data.requestId).maybeSingle();
  const { error } = await supabase.rpc("admin_review_verification", { p_request: p.data.requestId, p_approve: p.data.approve });
  // The selfie is only needed for the review: delete it afterwards (data minimisation).
  if (!error && req?.storage_path) {
    const { createAdminClient } = await import("@/lib/supabase/admin");
    try { await createAdminClient().storage.from("verification").remove([req.storage_path]); } catch {}
  }
  return done(error);
}

export async function adminUpdateBookingAction(input: unknown) {
  const p = z.object({ bookingId: z.uuid(), status: z.enum(["confirmed", "declined", "cancelled"]), note: z.string().max(500).optional() }).safeParse(input);
  if (!p.success) return fail("invalid_input");
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_update_booking", { p_booking: p.data.bookingId, p_status: p.data.status, p_note: p.data.note });
  return done(error);
}

const venueSchema = z.object({
  id: z.uuid().optional(),
  name: z.string().trim().min(2).max(120),
  slug: z.string().trim().regex(/^[a-z0-9-]{2,80}$/),
  category: z.enum(VENUE_CATEGORIES),
  neighborhood: z.string().max(40).optional().transform((v) => v || null),
  address: z.string().trim().min(3).max(200),
  description_it: z.string().max(1000).default(""),
  description_en: z.string().max(1000).default(""),
  price_level: z.coerce.number().int().min(1).max(4),
  image_urls: z.string().default("").transform((v) => v.split("\n").map((s) => s.trim()).filter((s) => /^https:\/\//.test(s)).slice(0, 6)),
  website: z.string().trim().max(300).optional().transform((v) => (v && /^https?:\/\//.test(v) ? v : null)),
  is_partner: z.boolean(),
  discount_it: z.string().max(200).optional().transform((v) => v || null),
  discount_en: z.string().max(200).optional().transform((v) => v || null),
  booking_mode: z.enum(["none", "request"]),
  is_active: z.boolean(),
});

export async function adminSaveVenueAction(input: unknown) {
  const p = venueSchema.safeParse(input);
  if (!p.success) return fail("invalid_input");
  const { id, ...v } = p.data;
  const row = { ...v, discount_it: v.is_partner ? v.discount_it : null, discount_en: v.is_partner ? v.discount_en : null };
  const supabase = await createClient();
  const { error } = id ? await supabase.from("venues").update(row).eq("id", id) : await supabase.from("venues").insert(row);
  return done(error);
}
