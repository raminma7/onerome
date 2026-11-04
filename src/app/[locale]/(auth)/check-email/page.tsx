import { toLocale } from "@/i18n/routing";
import { MailCheck } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ResendButton } from "./resend-button";

export default async function CheckEmail({ params, searchParams }: PageProps<"/[locale]/check-email">) {
  const locale = toLocale((await params).locale);
  setRequestLocale(locale);
  const { email } = await searchParams;
  const t = await getTranslations("auth");
  const address = typeof email === "string" ? email : "";
  return (
    <div className="text-center">
      <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-bordeaux-soft text-bordeaux"><MailCheck className="size-7" /></div>
      <h1 className="mt-6 text-4xl">{t("checkEmailTitle")}</h1>
      <p className="mt-3 text-muted">{t("checkEmailText", { email: address })}</p>
      {address && <ResendButton email={address} />}
    </div>
  );
}
