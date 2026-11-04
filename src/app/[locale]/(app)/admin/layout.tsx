import { getTranslations } from "next-intl/server";
import { requireAdmin } from "@/lib/auth";
import { AdminTabs } from "./tabs";

export const metadata = { robots: { index: false, follow: false } };

export default async function AdminLayout({ children }: LayoutProps<"/[locale]/admin">) {
  await requireAdmin();
  const t = await getTranslations("admin");
  return (
    <div>
      <h1 className="mb-4 text-4xl">{t("title")}</h1>
      <AdminTabs />
      <div className="mt-6">{children}</div>
    </div>
  );
}
