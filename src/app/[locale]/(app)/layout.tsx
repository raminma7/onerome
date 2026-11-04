import { AppNav } from "@/components/app-nav";
import { requireActiveProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({ children }: LayoutProps<"/[locale]">) {
  const profile = await requireActiveProfile();
  const supabase = await createClient();
  const [{ count }, { data: active }] = await Promise.all([
    supabase.from("notifications").select("id", { count: "exact", head: true }).is("read_at", null),
    supabase.from("connection_participants").select("connection_id").eq("user_id", profile.id).eq("is_active", true).maybeSingle(),
  ]);
  // Keep "last active" fresh for discover ordering (cheap, own row only).
  await supabase.from("profiles").update({ last_active_at: new Date().toISOString() }).eq("id", profile.id);

  return (
    <div className="bg-ambient min-h-dvh">
      <AppNav userId={profile.id} initialUnread={count ?? 0} inConnection={Boolean(active)} isAdmin={profile.role === "admin"} />
      <main className="mx-auto w-full max-w-6xl px-4 pb-32 pt-6 sm:px-6 md:pb-14 md:pt-10">{children}</main>
    </div>
  );
}
