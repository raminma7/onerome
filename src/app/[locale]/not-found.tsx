import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  const t = useTranslations("common");
  return (
    <main className="bg-travertine-texture flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <p className="font-display text-7xl text-bordeaux">404</p>
      <h1 className="mt-4 text-3xl">{t("notFoundTitle")}</h1>
      <p className="mt-2 max-w-sm text-muted">{t("notFoundText")}</p>
      <Link href="/" className={buttonVariants({ className: "mt-8" })}>{t("goHome")}</Link>
    </main>
  );
}
