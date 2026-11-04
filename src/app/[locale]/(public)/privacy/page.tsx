import { getTranslations, setRequestLocale } from "next-intl/server";
import { LegalPage } from "@/components/legal-page";
import { privacy } from "@/content/legal";
import { toLocale } from "@/i18n/routing";

export async function generateMetadata() {
  const t = await getTranslations("legal");
  return { title: t("privacyTitle") };
}

export default async function Page({ params }: PageProps<"/[locale]/privacy">) {
  const locale = toLocale((await params).locale);
  setRequestLocale(locale);
  const t = await getTranslations("legal");
  return <LegalPage title={t("privacyTitle")} sections={privacy[locale].sections} />;
}
