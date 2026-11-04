import { ChevronRight, CreditCard, Download, LogOut, ShieldCheck, UserRound } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { LanguageSwitcher } from "@/components/language-switcher";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Link } from "@/i18n/navigation";
import { toLocale } from "@/i18n/routing";
import { requireActiveProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { logoutAction } from "@/server/actions/auth";
import { DeleteAccount, VerificationCard, VisibilitySettings } from "./client";

export async function generateMetadata() {
  const t = await getTranslations("settings");
  return { title: t("title") };
}

export default async function SettingsPage({ params }: PageProps<"/[locale]/settings">) {
  setRequestLocale(toLocale((await params).locale));
  const me = await requireActiveProfile();
  const t = await getTranslations("settings");
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const email = (claims?.claims?.email as string | undefined) ?? "";

  const row = (href: "/settings/profile" | "/billing" | "/safety", icon: React.ReactNode, label: string) => (
    <Link href={href} className="flex items-center gap-4 px-5 py-4 transition hover:bg-cream/60">
      <span className="text-bordeaux [&_svg]:size-5">{icon}</span>
      <span className="flex-1">{label}</span>
      <ChevronRight className="size-4 text-muted" />
    </Link>
  );

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader title={t("title")} />

      <Card className="divide-y divide-line/70 overflow-hidden">
        {row("/settings/profile", <UserRound />, t("editProfile"))}
        {row("/billing", <CreditCard />, t("billing"))}
        {row("/safety", <ShieldCheck />, t("safety"))}
      </Card>

      <Card className="space-y-4 p-5">
        <h2 className="text-2xl">{t("account")}</h2>
        <div className="flex items-center justify-between gap-4 text-sm">
          <span className="text-muted">{t("email")}</span>
          <span className="truncate">{email}</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm">{t("language")}</p>
            <p className="text-xs text-muted">{t("languageHint")}</p>
          </div>
          <LanguageSwitcher persist />
        </div>
      </Card>

      <VisibilitySettings isHidden={me.is_hidden} notifyLikes={me.notify_likes} />
      <VerificationCard userId={me.id} status={me.verification} />

      <Card className="space-y-4 p-5">
        <h2 className="text-2xl">{t("privacy")}</h2>
        <div>
          <a href="/api/account/export" className="inline-flex items-center gap-2 text-sm font-medium text-bordeaux hover:underline" download>
            <Download className="size-4" /> {t("exportData")}
          </a>
          <p className="mt-1 text-xs text-muted">{t("exportHint")}</p>
        </div>
        <DeleteAccount />
      </Card>

      <form action={logoutAction}>
        <Button variant="outline" className="w-full" type="submit"><LogOut /> {t("logout")}</Button>
      </form>
      <p className="text-center text-xs text-muted">
        <Link href="/privacy" className="hover:underline">Privacy</Link> · <Link href="/terms" className="hover:underline">Terms</Link>
      </p>
    </div>
  );
}
