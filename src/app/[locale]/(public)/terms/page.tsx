import { getTranslations, setRequestLocale } from "next-intl/server";
import { LegalPage } from "@/components/legal-page";
import { terms } from "@/content/legal";
import { toLocale } from "@/i18n/routing";

export async function generateMetadata() {
  const t = await getTranslations("legal");
  return { title: t("termsTitle") };
}

export default async function Page({ params }: PageProps<"/[locale]/terms">) {
  const locale = toLocale((await params).locale);
  setRequestLocale(locale);
  const t = await getTranslations("legal");
  return <LegalPage title={t("termsTitle")} sections={terms[locale].sections} />;
}
