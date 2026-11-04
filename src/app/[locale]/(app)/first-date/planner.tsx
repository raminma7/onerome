"use client";
import { CalendarCheck, ExternalLink, Heart, MapPin, ShieldCheck, Tag } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useState } from "react";
import { Badge, Card, Notice } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { Field, Input } from "@/components/ui/input";
import { VENUE_CATEGORIES } from "@/lib/domain/options";
import type { Tables } from "@/lib/supabase/database.types";
import { useAction } from "@/lib/use-action";
import { cn } from "@/lib/utils";
import { firstDateCancelAction, firstDateConfirmAction, firstDateOptInAction, firstDateProposeAction } from "@/server/actions/first-date";

type Venue = Tables<"venues">;
type Plan = {
  status: string; meOptedIn: boolean; partnerOptedIn: boolean; meConfirmed: boolean; partnerConfirmed: boolean;
  venueId: string | null; scheduledFor: string | null; proposedByMe: boolean;
} | null;

const CATEGORY_GRADIENT: Record<string, string> = {
  cafe: "from-[#c89b6d] to-[#6b4226]", restaurant: "from-[#c0563f] to-[#5c1520]", wine_bar: "from-[#7a1f2b] to-[#2a0e14]",
  gelateria: "from-[#f1c6a8] to-[#c97b63]", culture: "from-[#d8c3a0] to-[#7d6748]", park: "from-[#9caf6e] to-[#4d5a2c]",
  experience: "from-[#b9cde0] to-[#4f6f8f]",
};

export function FirstDatePlanner({ connectionId, partnerName, plan, bookingStatus, venues, locale }: {
  connectionId: string; meId: string; partnerName: string; plan: Plan; bookingStatus: string | null; venues: Venue[]; locale: "it" | "en";
}) {
  const t = useTranslations("firstDate");
  const v = useTranslations("venues");
  const format = useFormatter();
  const [run, pending] = useAction();
  const [category, setCategory] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [when, setWhen] = useState("");

  const unlocked = plan && ["planning", "confirmed"].includes(plan.status);
  const proposedVenue = venues.find((x) => x.id === plan?.venueId);
  const shown = venues.filter((x) => !category || x.category === category);
  const desc = (x: Venue) => (locale === "it" ? x.description_it : x.description_en);
  const discount = (x: Venue) => (locale === "it" ? x.discount_it : x.discount_en);

  return (
    <div className="space-y-6">
      {/* Status card */}
      <Card className="p-6">
        {!unlocked ? (
          <div className="space-y-4">
            {plan?.partnerOptedIn && !plan.meOptedIn && <Notice tone="success">{t("partnerReady", { name: partnerName })}</Notice>}
            {plan?.meOptedIn ? (
              <p className="flex items-center gap-2 text-muted"><Heart className="size-4 text-bordeaux" /> {t("waitingPartner", { name: partnerName })}</p>
            ) : (
              <Button size="lg" loading={pending} onClick={() => run(() => firstDateOptInAction(connectionId))}><Heart /> {t("optIn")}</Button>
            )}
          </div>
        ) : plan.status === "confirmed" && proposedVenue && plan.scheduledFor ? (
          <div className="space-y-3">
            <p className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-gold"><CalendarCheck className="size-4" /> {t("confirmedTitle")}</p>
            <p className="font-display text-3xl">{t("confirmedText", { venue: proposedVenue.name, date: format.dateTime(new Date(plan.scheduledFor), { dateStyle: "full", timeStyle: "short" }) })}</p>
            <p className="flex items-center gap-1.5 text-sm text-muted"><MapPin className="size-4" /> {proposedVenue.address}</p>
            <Badge tone={bookingStatus === "confirmed" ? "success" : bookingStatus === "declined" ? "danger" : "neutral"}>
              {t(`booking.${(bookingStatus ?? "none") as "none"}`)}
            </Badge>
            <div className="flex flex-wrap gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => run(() => firstDateCancelAction(connectionId))}>{t("change")}</Button>
            </div>
          </div>
        ) : proposedVenue && plan.scheduledFor ? (
          <div className="space-y-3">
            <p className="text-xs uppercase tracking-[0.2em] text-gold">{t("proposal")} · {plan.proposedByMe ? t("proposedByYou") : t("proposedBy", { name: partnerName })}</p>
            <p className="font-display text-3xl">{proposedVenue.name}</p>
            <p className="text-sm text-muted">{format.dateTime(new Date(plan.scheduledFor), { dateStyle: "full", timeStyle: "short" })}</p>
            {plan.meConfirmed ? (
              <p className="text-sm text-muted">{t("youConfirmed")} {t("waitingConfirmation", { name: partnerName })}</p>
            ) : (
              <Button loading={pending} onClick={() => run(() => firstDateConfirmAction(connectionId))}>{t("confirm")}</Button>
            )}
            <div><Button variant="link" onClick={() => run(() => firstDateCancelAction(connectionId))}>{t("cancel")}</Button></div>
          </div>
        ) : (
          <p className="text-muted">{t("unlocked")}</p>
        )}
        <div className="mt-5 space-y-1 border-t border-line/70 pt-4 text-xs text-muted">
          <p className="flex items-start gap-2"><ShieldCheck className="mt-0.5 size-3.5 shrink-0" /> {t("safetyTip")}</p>
          <p className="flex items-start gap-2"><MapPin className="mt-0.5 size-3.5 shrink-0" /> {t("privacyNote")}</p>
        </div>
      </Card>

      {/* Venues */}
      <section>
        <h2 className="text-3xl">{v("title")}</h2>
        <p className="mb-4 text-sm text-muted">{v("subtitle")}</p>
        <div className="scrollbar-none -mx-4 mb-5 flex gap-2 overflow-x-auto px-4">
          <Chip selected={!category} onClick={() => setCategory(null)}>{v("all")}</Chip>
          {VENUE_CATEGORIES.filter((cat) => venues.some((x) => x.category === cat)).map((cat) => (
            <Chip key={cat} selected={category === cat} onClick={() => setCategory(cat)}>{v(`category.${cat}`)}</Chip>
          ))}
        </div>
        {shown.length === 0 && <p className="text-muted">{v("empty")}</p>}
        <ul className="grid gap-4 sm:grid-cols-2">
          {shown.map((x) => (
            <li key={x.id}>
              <Card className={cn("overflow-hidden transition", selected === x.id && "ring-2 ring-bordeaux")}>
                <div className={cn("relative h-36 bg-gradient-to-br", CATEGORY_GRADIENT[x.category])}>
                  {x.image_urls[0] && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={x.image_urls[0]} alt="" className="absolute inset-0 size-full object-cover" />
                  )}
                  <div className="absolute left-3 top-3 flex gap-2">
                    <Badge className="bg-ivory/90">{v(`category.${x.category}`)}</Badge>
                    {x.is_partner && <Badge tone="gold" className="bg-gold-soft">{v("partner")}</Badge>}
                  </div>
                </div>
                <div className="space-y-2 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-2xl leading-tight">{x.name}</h3>
                    <span className="text-sm text-muted" aria-label={v("price")}>{"€".repeat(x.price_level)}</span>
                  </div>
                  <p className="flex items-center gap-1 text-xs text-muted"><MapPin className="size-3.5" /> {x.address}</p>
                  <p className="text-sm leading-relaxed text-ink-soft">{desc(x)}</p>
                  {x.is_partner && discount(x) && <p className="flex items-center gap-1.5 text-sm text-bordeaux"><Tag className="size-4" /> {v("discount")}: {discount(x)}</p>}
                  <p className="text-xs text-muted">{x.booking_mode === "request" ? v("bookable") : v("notBookable")}</p>
                  <div className="flex items-center justify-between pt-1">
                    {x.website ? <a href={x.website} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-bordeaux hover:underline">{v("website")} <ExternalLink className="size-3" /></a> : <span />}
                    {unlocked && <Button size="sm" variant={selected === x.id ? "primary" : "outline"} onClick={() => setSelected(x.id)}>{v("select")}</Button>}
                  </div>
                  {unlocked && selected === x.id && (
                    <form className="space-y-3 border-t border-line/70 pt-4" onSubmit={(e) => {
                      e.preventDefault();
                      if (!when) return;
                      run(() => firstDateProposeAction({ connectionId, venueId: x.id, scheduledFor: new Date(when).toISOString() }), { onSuccess: () => setSelected(null) });
                    }}>
                      <Field label={t("chooseTime")} htmlFor={`when-${x.id}`}>
                        <Input id={`when-${x.id}`} type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} required />
                      </Field>
                      <Button type="submit" className="w-full" loading={pending}>{t("propose")}</Button>
                    </form>
                  )}
                </div>
              </Card>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
