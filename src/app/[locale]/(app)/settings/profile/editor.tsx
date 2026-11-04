"use client";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { PhotoManager, type ManagedPhoto } from "@/components/profile/photo-manager";
import {
  BasicsFields, GoalFields, InterestsFields, LifestyleFields, PreferenceFields, RomeFields, ValuesFields,
  type Neighborhood, type PreferencesDraft, type ProfileDraft,
} from "@/components/profile/profile-fields";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAction } from "@/lib/use-action";
import { updatePreferencesAction, updateProfileAction } from "@/server/actions/settings";

export function ProfileEditor(props: { userId: string; neighborhoods: Neighborhood[]; photos: ManagedPhoto[]; profile: ProfileDraft; preferences: PreferencesDraft }) {
  const t = useTranslations("onboarding");
  const s = useTranslations("settings");
  const c = useTranslations("common");
  const [profile, setProfile] = useState(props.profile);
  const [prefs, setPrefs] = useState(props.preferences);
  const [run, pending] = useAction();
  const [runPrefs, pendingPrefs] = useAction();
  const patch = (p: Partial<ProfileDraft>) => setProfile((x) => ({ ...x, ...p }));

  const section = (title: string, children: React.ReactNode) => (
    <Card className="space-y-5 p-5 sm:p-7"><h2 className="text-2xl">{title}</h2>{children}</Card>
  );

  return (
    <div className="space-y-6">
      {section(t("steps.photos"), <PhotoManager userId={props.userId} initial={props.photos} />)}
      {section(t("steps.basics"), <BasicsFields value={profile} onChange={patch} />)}
      {section(t("steps.rome"), <RomeFields value={profile} onChange={patch} neighborhoods={props.neighborhoods} />)}
      {section(t("steps.goals"), <GoalFields value={profile} onChange={patch} />)}
      {section(t("steps.interests"), <InterestsFields value={profile} onChange={patch} />)}
      {section(t("steps.values"), <ValuesFields value={profile} onChange={patch} />)}
      {section(t("steps.lifestyle"), <LifestyleFields value={profile} onChange={patch} />)}
      <div className="sticky bottom-20 z-20 md:bottom-4">
        <Button size="lg" className="w-full shadow-lift" loading={pending} onClick={() => run(() => updateProfileAction(profile), { success: c("saved") })}>
          {c("save")}
        </Button>
      </div>
      <div id="preferences" className="scroll-mt-24">
        {section(s("preferences"), (
          <>
            <PreferenceFields value={prefs} onChange={(p) => setPrefs((x) => ({ ...x, ...p }))} />
            <Button variant="dark" loading={pendingPrefs} onClick={() => runPrefs(() => updatePreferencesAction(prefs), { success: c("saved") })}>{c("save")}</Button>
          </>
        ))}
      </div>
    </div>
  );
}
