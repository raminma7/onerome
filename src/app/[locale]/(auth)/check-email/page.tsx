import { redirect } from "@/i18n/navigation";
import { toLocale } from "@/i18n/routing";

/** Legacy route: email confirmation now uses a code. */
export default async function CheckEmail({ params, searchParams }: PageProps<"/[locale]/check-email">) {
  const locale = toLocale((await params).locale);
  const { email } = await searchParams;
  redirect({ href: typeof email === "string" ? `/verify-email?email=${encodeURIComponent(email)}` : "/register", locale });
}
