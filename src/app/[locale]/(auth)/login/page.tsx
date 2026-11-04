import { toLocale } from "@/i18n/routing";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { LoginForm } from "./login-form";

export async function generateMetadata() {
  const t = await getTranslations("auth");
  return { title: t("loginTitle") };
}

export default async function LoginPage({ params, searchParams }: PageProps<"/[locale]/login">) {
  const locale = toLocale((await params).locale);
  setRequestLocale(locale);
  const sp = await searchParams;
  const t = await getTranslations("auth");
  return (
    <>
      <h1 className="text-4xl">{t("loginTitle")}</h1>
      <p className="mt-2 text-muted">{t("loginSubtitle")}</p>
      <LoginForm verifyError={sp.error === "verify"} next={typeof sp.next === "string" ? sp.next : undefined} />
    </>
  );
}
