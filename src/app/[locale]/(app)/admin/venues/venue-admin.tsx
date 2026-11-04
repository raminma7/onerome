"use client";
import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Badge, Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { VENUE_CATEGORIES } from "@/lib/domain/options";
import type { Tables } from "@/lib/supabase/database.types";
import { useAction } from "@/lib/use-action";
import { adminSaveVenueAction } from "@/server/actions/admin";

type Venue = Tables<"venues">;
type Form = Omit<Venue, "id" | "created_at" | "updated_at" | "image_urls"> & { id?: string; image_urls: string };

const EMPTY: Form = {
  name: "", slug: "", category: "cafe", neighborhood: null, address: "", description_it: "", description_en: "", price_level: 2,
  image_urls: "", website: null, is_partner: false, discount_it: null, discount_en: null, booking_mode: "none", is_active: true,
};

export function VenueAdmin({ venues, neighborhoods }: { venues: Venue[]; neighborhoods: { slug: string; name: string }[] }) {
  const t = useTranslations("admin");
  const f = useTranslations("admin.fields");
  const v = useTranslations("venues");
  const c = useTranslations("common");
  const [form, setForm] = useState<Form | null>(null);
  const [run, pending] = useAction();
  const set = (p: Partial<Form>) => setForm((x) => (x ? { ...x, ...p } : x));

  return (
    <div className="space-y-4">
      <Button onClick={() => setForm(EMPTY)}><Plus /> {t("newVenue")}</Button>
      <Card className="divide-y divide-line/70 overflow-hidden">
        {venues.map((x) => (
          <button key={x.id} onClick={() => setForm({ ...x, image_urls: x.image_urls.join("\n") })} className="flex w-full items-center gap-3 p-4 text-left text-sm hover:bg-cream/60">
            <span className="flex-1"><span className="font-medium">{x.name}</span> <span className="text-xs text-muted">· {x.address}</span></span>
            <Badge>{v(`category.${x.category}`)}</Badge>
            {x.is_partner && <Badge tone="gold">{v("partner")}</Badge>}
            {!x.is_active && <Badge tone="danger">off</Badge>}
          </button>
        ))}
      </Card>
      <Dialog open={!!form} onOpenChange={(o) => !o && setForm(null)}>
        {form && (
          <DialogContent title={form.id ? form.name : t("newVenue")} className="sm:max-w-xl">
            <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); run(() => adminSaveVenueAction(form), { success: t("venueSaved"), onSuccess: () => setForm(null) }); }}>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label={f("name")}><Input value={form.name} onChange={(e) => set({ name: e.target.value })} required /></Field>
                <Field label={f("slug")}><Input value={form.slug} pattern="[a-z0-9-]+" onChange={(e) => set({ slug: e.target.value })} required /></Field>
                <Field label={f("category")}>
                  <Select value={form.category} onChange={(e) => set({ category: e.target.value as Form["category"] })}>
                    {VENUE_CATEGORIES.map((c) => <option key={c} value={c}>{v(`category.${c}`)}</option>)}
                  </Select>
                </Field>
                <Field label={f("neighborhood")}>
                  <Select value={form.neighborhood ?? ""} onChange={(e) => set({ neighborhood: e.target.value || null })}>
                    <option value="">—</option>
                    {neighborhoods.map((n) => <option key={n.slug} value={n.slug}>{n.name}</option>)}
                  </Select>
                </Field>
              </div>
              <Field label={f("address")}><Input value={form.address} onChange={(e) => set({ address: e.target.value })} required /></Field>
              <Field label={f("description_it")}><Textarea value={form.description_it} onChange={(e) => set({ description_it: e.target.value })} /></Field>
              <Field label={f("description_en")}><Textarea value={form.description_en} onChange={(e) => set({ description_en: e.target.value })} /></Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label={f("price_level")}><Input type="number" min={1} max={4} value={form.price_level} onChange={(e) => set({ price_level: Number(e.target.value) })} /></Field>
                <Field label={f("booking_mode")}>
                  <Select value={form.booking_mode} onChange={(e) => set({ booking_mode: e.target.value as Form["booking_mode"] })}>
                    <option value="none">{t("bookingMode.none")}</option>
                    <option value="request">{t("bookingMode.request")}</option>
                  </Select>
                </Field>
              </div>
              <Field label={f("website")}><Input type="url" value={form.website ?? ""} onChange={(e) => set({ website: e.target.value || null })} /></Field>
              <Field label={f("image_urls")}><Textarea value={form.image_urls} onChange={(e) => set({ image_urls: e.target.value })} /></Field>
              <label className="flex items-center justify-between text-sm">{f("is_partner")}<Switch checked={form.is_partner} onCheckedChange={(c) => set({ is_partner: c })} /></label>
              {form.is_partner && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label={f("discount_it")}><Input value={form.discount_it ?? ""} onChange={(e) => set({ discount_it: e.target.value })} /></Field>
                  <Field label={f("discount_en")}><Input value={form.discount_en ?? ""} onChange={(e) => set({ discount_en: e.target.value })} /></Field>
                </div>
              )}
              <label className="flex items-center justify-between text-sm">{f("is_active")}<Switch checked={form.is_active} onCheckedChange={(c) => set({ is_active: c })} /></label>
              <Button type="submit" className="w-full" loading={pending}>{c("save")}</Button>
            </form>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
