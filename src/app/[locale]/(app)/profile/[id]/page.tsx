import { UserX } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { EmptyState } from "@/components/page-header";
import { PhotoCarousel, ProfileDetails, ProfileHeading } from "@/components/profile/profile-view";
import { ProfileSafetyActions } from "@/components/safety/safety-actions";
import { buttonVariants } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { toLocale } from "@/i18n/routing";
import { requireActiveProfile } from "@/lib/auth";
import { getPublicProfiles } from "@/lib/data/profiles";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

export default async function ProfilePage({ params }: PageProps<"/[locale]/profile/[id]">) {
  const { locale, id } = await params;
  setRequestLocale(toLocale(locale));
  const me = await requireActiveProfile();
  const t = await getTranslations("profile");
  const supabase = await createClient();
  const valid = z.uuid().safeParse(id).success;
  const profile = valid ? (await getPublicProfiles(supabase, [id]))[id] : undefined;

  if (!profile) {
    return <EmptyState icon={<UserX />} title={t("unavailable")} />;
  }
  const isMe = profile.id === me.id;
  const data = { ...profile, id: profile.id!, photos: profile.photos };

  return (
    <article className="mx-auto grid max-w-5xl gap-8 md:grid-cols-[minmax(0,420px)_1fr]">
      <div className="relative">
        <PhotoCarousel photos={data.photos} name={data.display_name ?? ""} className="aspect-[3/4] w-full rounded-[2rem] shadow-lift" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 rounded-b-[2rem] bg-gradient-to-t from-ink/80 to-transparent p-6 pt-20 text-ivory">
          <ProfileHeading profile={data} />
        </div>
      </div>
      <div className="space-y-6">
        <ProfileDetails profile={data} />
        {isMe ? (
          <Link href="/settings/profile" className={buttonVariants({ variant: "outline" })}>{t("edit")}</Link>
        ) : (
          <ProfileSafetyActions target={data.id} name={data.display_name ?? ""} />
        )}
      </div>
    </article>
  );
}
