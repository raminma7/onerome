import { getFormatter, getTranslations } from "next-intl/server";
import { Card } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { VerificationActions } from "../widgets";

export default async function AdminVerifications() {
  const t = await getTranslations("admin");
  const format = await getFormatter();
  const supabase = await createClient();
  const { data: requests } = await supabase.rpc("admin_list_verifications");
  const paths = (requests ?? []).map((r) => r.storage_path);
  const { data: signed } = paths.length ? await supabase.storage.from("verification").createSignedUrls(paths, 600) : { data: [] };
  const urls = new Map((signed ?? []).map((s) => [s.path, s.signedUrl]));
  const { data: photos } = requests?.length ? await supabase.from("profile_photos").select("user_id, storage_path").in("user_id", requests.map((r) => r.user_id)).order("position") : { data: [] };
  const { data: profileSigned } = photos?.length ? await supabase.storage.from("profile-photos").createSignedUrls(photos.map((p) => p.storage_path), 600) : { data: [] };
  const profileUrls = new Map((profileSigned ?? []).map((s) => [s.path, s.signedUrl]));
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {!requests?.length && <p className="text-sm text-muted">{t("noRows")}</p>}
      {requests?.map((r) => (
        <Card key={r.id} className="space-y-3 p-5">
          <p className="font-medium">{r.display_name} <span className="text-xs text-muted">· {format.dateTime(new Date(r.created_at), { dateStyle: "medium" })}</span></p>
          <div className="flex gap-2 overflow-x-auto">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {urls.get(r.storage_path) && <img src={urls.get(r.storage_path)!} alt="selfie" className="h-40 rounded-xl ring-2 ring-gold" />}
            {(photos ?? []).filter((p) => p.user_id === r.user_id).map((p) =>
              // eslint-disable-next-line @next/next/no-img-element
              profileUrls.get(p.storage_path) ? <img key={p.storage_path} src={profileUrls.get(p.storage_path)!} alt="" className="h-40 rounded-xl" /> : null)}
          </div>
          <VerificationActions requestId={r.id} />
        </Card>
      ))}
    </div>
  );
}
