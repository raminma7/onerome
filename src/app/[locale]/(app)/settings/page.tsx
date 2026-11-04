import { BadgeCheck, ChevronRight, CreditCard, Download, FileText, Languages, LogOut, PencilLine, ShieldCheck } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { LanguageSwitcher } from "@/components/language-switcher";
import { PageHeader } from "@/components/page-header";
import { Photo } from "@/components/photo";
import { Button, buttonVariants } from "@/components/ui/button";
import { IconTile } from "@/components/ui/card";
import { Link } from "@/i18n/navigation";
import { toLocale } from "@/i18n/routing";
import { requireActiveProfile } from "@/lib/auth";
import { signPhotoPaths } from "@/lib/photos";
import { createClient } from "@/lib/supabase/server";
import { ageFromBirthDate } from "@/lib/validation/schemas";
import { logoutAction } from "@/server/actions/auth";
import { DeleteAccount, VerificationCard, VisibilitySettings } from "./client";

export async function generateMetadata() {
  const t = await getTranslations("settings");
  return { title: t("title") };
}

function Group({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <section>
      {title && <h2 className="mb-2 px-4 font-sans text-xs font-semibold uppercase tracking-[0.16em] text-muted">{title}</h2>}
      <div className="divide-y divide-ink/[0.06] overflow-hidden rounded-[1.75rem] bg-white/85 shadow-soft ring-1 ring-white">{children}</div>
    </section>
  );
}

export default async function SettingsPage({ params }: PageProps<"/[locale]/settings">) {
  setRequestLocale(toLocale((await params).locale));
  const me = await requireActiveProfile();
  const t = await getTranslations("settings");
  const p = await getTranslations("profile");
  const supabase = await createClient();
  const [{ data: claims }, { data: photos }] = await Promise.all([
    supabase.auth.getClaims(),
    supabase.from("profile_photos").select("storage_path").eq("user_id", me.id).order("position").limit(1),
  ]);
  const email = (claims?.claims?.email as string | undefined) ?? "";
  const urls = await signPhotoPaths(supabase, (photos ?? []).map((x) => x.storage_path));
  const photo = photos?.[0] ? urls[photos[0].storage_path] : null;
  const age = me.birth_date ? ageFromBirthDate(me.birth_date) : null;

  const row = (href: "/settings/profile" | "/billing" | "/safety" | "/privacy" | "/terms", icon: React.ReactNode, tile: string, label: string) => (
    <Link href={href} className="flex items-center gap-3.5 px-4 py-3.5 transition hover:bg-ink/[0.03]">
      <IconTile className={tile}>{icon}</IconTile>
      <span className="flex-1 text-[15px] font-medium">{label}</span>
      <ChevronRight className="size-4 text-muted" />
    </Link>
  );

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader title={t("title")} />

      {/* Profile card */}
      <section className="bg-night noise relative animate-fade-up overflow-hidden rounded-[2rem] p-5 text-white shadow-lift">
        <div className="bg-brand pointer-events-none absolute -right-16 -top-20 size-64 rounded-full opacity-50 blur-3xl" />
        <div className="relative flex items-center gap-4">
          <span className="bg-brand shrink-0 rounded-full p-[3px]"><Photo src={photo} alt="" className="size-20 rounded-full ring-2 ring-night" /></span>
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-2 font-display text-4xl leading-none">
              {me.display_name}{age ? <span className="font-sans text-lg font-light text-white/70">{age}</span> : null}
              {me.verification === "verified" && <BadgeCheck className="size-6 fill-sky-500 text-white" />}
            </p>
            <p className="mt-1.5 truncate text-sm text-white/55">{email}</p>
          </div>
        </div>
        <div className="relative mt-5 grid grid-cols-2 gap-2">
          <Link href="/settings/profile" className={buttonVariants({ variant: "light", size: "sm" })}><PencilLine /> {p("edit")}</Link>
          <Link href={`/profile/${me.id}`} className={buttonVariants({ variant: "ghost", size: "sm", className: "text-white ring-1 ring-white/20 hover:bg-white/10" })}>{p("title")}</Link>
        </div>
      </section>

      <Group>
        {row("/billing", <CreditCard />, "bg-brand", t("billing"))}
        {row("/safety", <ShieldCheck />, "bg-[#2f9e6e]", t("safety"))}
        <div className="flex items-center gap-3.5 px-4 py-3">
          <IconTile className="bg-[#4f6bed]"><Languages /></IconTile>
          <span className="flex-1">
            <span className="block text-[15px] font-medium">{t("language")}</span>
            <span className="block text-xs text-muted">{t("languageHint")}</span>
          </span>
          <LanguageSwitcher persist />
        </div>
      </Group>

      <VisibilitySettings isHidden={me.is_hidden} notifyLikes={me.notify_likes} />
      <VerificationCard userId={me.id} status={me.verification} />

      <Group title={t("privacy")}>
        <a href="/api/account/export" download className="flex items-center gap-3.5 px-4 py-3.5 transition hover:bg-ink/[0.03]">
          <IconTile className="bg-[#8a7c75]"><Download /></IconTile>
          <span className="flex-1">
            <span className="block text-[15px] font-medium">{t("exportData")}</span>
            <span className="block text-xs text-muted">{t("exportHint")}</span>
          </span>
        </a>
        {row("/privacy", <FileText />, "bg-[#8a7c75]", "Privacy")}
        {row("/terms", <FileText />, "bg-[#8a7c75]", "Terms")}
        <DeleteAccount />
      </Group>

      <form action={logoutAction}>
        <Button variant="outline" size="lg" className="w-full" type="submit"><LogOut /> {t("logout")}</Button>
      </form>
    </div>
  );
}
