import { BadgeCheck, ShieldCheck } from "lucide-react";
import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader } from "@/components/page-header";
import { ManualReview } from "@/components/verification/manual-review";
import { VerificationFlow } from "@/components/verification/verification-flow";
import { buttonVariants } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { toLocale } from "@/i18n/routing";
import { requireActiveProfile } from "@/lib/auth";
import { isFaceVerificationConfigured } from "@/lib/face/aws";
import { signPhotoPaths } from "@/lib/photos";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata() {
  const t = await getTranslations("verify");
  return { title: t("title") };
}

export default async function VerifyPage({ params }: PageProps<"/[locale]/verify">) {
  setRequestLocale(toLocale((await params).locale));
  const me = await requireActiveProfile();
  const t = await getTranslations("verify");
  const format = await getFormatter();
  const supabase = await createClient();

  if (me.verification === "verified") {
    return (
      <div className="mx-auto max-w-xl">
        <PageHeader title={t("verifiedTitle")} />
        <div className="bg-night noise relative overflow-hidden rounded-[2rem] p-8 text-center text-white shadow-lift">
          <div className="bg-brand pointer-events-none absolute -top-20 left-1/2 size-64 -translate-x-1/2 rounded-full opacity-50 blur-3xl" />
          <BadgeCheck className="relative mx-auto size-16 fill-sky-500 text-white" />
          <p className="relative mt-4 text-white/75">{t("verifiedText", { date: me.verified_at ? format.dateTime(new Date(me.verified_at), { dateStyle: "long" }) : "" })}</p>
          <Link href="/discover" className={buttonVariants({ size: "lg", className: "relative mt-6" })}>{t("toDiscover")}</Link>
        </div>
      </div>
    );
  }

  const [{ data: photos }, { data: pendingManual }] = await Promise.all([
    supabase.from("profile_photos").select("storage_path").eq("user_id", me.id).order("position").limit(1),
    supabase.from("verification_requests").select("id").eq("user_id", me.id).eq("status", "pending").maybeSingle(),
  ]);
  const urls = await signPhotoPaths(supabase, (photos ?? []).map((p) => p.storage_path));
  const cover = photos?.[0] ? urls[photos[0].storage_path] ?? null : null;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader eyebrow={<span className="inline-flex items-center gap-1.5"><ShieldCheck className="size-4" /> OneRome Verified</span>} title={t("title")} subtitle={t("subtitle")} />
      <VerificationFlow coverPhoto={cover} available={isFaceVerificationConfigured} />
      <section className="rounded-[1.75rem] bg-white/85 p-5 shadow-soft ring-1 ring-white">
        <h2 className="text-xl">{t("whyTitle")}</h2>
        <ul className="mt-3 space-y-2 text-sm text-ink-soft">
          {[t("why1"), t("why2"), t("why3")].map((w) => <li key={w} className="flex gap-2"><BadgeCheck className="size-4 shrink-0 text-success" /> {w}</li>)}
        </ul>
      </section>
      <ManualReview userId={me.id} pending={Boolean(pendingManual)} />
    </div>
  );
}
