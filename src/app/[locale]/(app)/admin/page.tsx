import { getTranslations } from "next-intl/server";
import { Card } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import en from "@/messages/en.json";

export default async function AdminOverview() {
  const t = await getTranslations("admin.stats");
  const supabase = await createClient();
  const { data } = await supabase.rpc("admin_stats");
  const stats = (data ?? {}) as Record<string, number>;
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {(Object.keys(en.admin.stats) as (keyof typeof en.admin.stats)[]).map((key) => (
        <Card key={key} className="p-5">
          <p className="text-xs text-muted">{t(key)}</p>
          <p className="mt-1 font-display text-4xl">{stats[key] ?? 0}</p>
        </Card>
      ))}
    </div>
  );
}
