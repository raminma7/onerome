import { MailCheck } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { toLocale } from "@/i18n/routing";
import { CodeForm } from "./code-form";

export async function generateMetadata() {
  const t = await getTranslations("auth");
  return { title: t("codeTitle") };
}

export default async function VerifyEmailPage({ params, searchParams }: PageProps<"/[locale]/verify-email">) {
  const locale = toLocale((await params).locale);
  setRequestLocale(locale);
  const { email } = await searchParams;
  if (typeof email !== "string" || !email.includes("@")) redirect({ href: "/register", locale });
  const t = await getTranslations("auth");
  return (
    <div>
      <div className="bg-brand mb-6 flex size-14 animate-pop items-center justify-center rounded-2xl text-white shadow-glow"><MailCheck className="size-6" /></div>
      <h1 className="text-4xl">{t("codeTitle")}</h1>
      <p className="mt-3 text-[15px] leading-relaxed text-muted">{t.rich("codeText", { email: String(email) })}</p>
      <CodeForm email={String(email)} />
    </div>
  );
}
