import { toLocale } from "@/i18n/routing";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { RegisterForm } from "./register-form";

export async function generateMetadata() {
  const t = await getTranslations("auth");
  return { title: t("registerTitle") };
}

export default async function RegisterPage({ params }: PageProps<"/[locale]/register">) {
  const locale = toLocale((await params).locale);
  setRequestLocale(locale);
  const t = await getTranslations("auth");
  return (
    <>
      <h1 className="text-4xl">{t("registerTitle")}</h1>
      <p className="mt-2 text-muted">{t("registerSubtitle")}</p>
      <RegisterForm />
    </>
  );
}
