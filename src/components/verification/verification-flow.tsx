"use client";
import { CheckCircle2, Image as ImageIcon, ScanFace, ShieldCheck, Sparkles, XCircle } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import dynamic from "next/dynamic";
import { useState } from "react";
import { Photo } from "@/components/photo";
import { Button, buttonVariants } from "@/components/ui/button";
import { Notice } from "@/components/ui/card";
import { Link } from "@/i18n/navigation";
import type { ErrorCode } from "@/lib/errors";
import { useErrorText } from "@/lib/use-action";
import { cn } from "@/lib/utils";
import { completeFaceVerificationAction, startFaceVerificationAction } from "@/server/actions/verification";

const LivenessDetector = dynamic(() => import("./liveness-detector"), {
  ssr: false,
  loading: () => <div className="shimmer h-[480px] animate-shimmer rounded-[1.75rem] bg-travertine/70" />,
});

type Stage = "intro" | "starting" | "live" | "checking" | "success" | "failed";

export function VerificationFlow({ coverPhoto, available }: { coverPhoto: string | null; available: boolean }) {
  const t = useTranslations("verify");
  const errorText = useErrorText();
  const locale = useLocale() as "it" | "en";
  const [stage, setStage] = useState<Stage>("intro");
  const [consent, setConsent] = useState(false);
  const [session, setSession] = useState<{ sessionId: string; region: string } | null>(null);
  const [error, setError] = useState<ErrorCode | null>(null);

  async function start() {
    setError(null);
    setStage("starting");
    const result = await startFaceVerificationAction({ consent });
    if (!result.ok) {
      setError(result.error);
      setStage("failed");
      return;
    }
    setSession(result.data);
    setStage("live");
  }

  async function complete() {
    if (!session) return;
    setStage("checking");
    const result = await completeFaceVerificationAction(session.sessionId);
    if (result.ok) setStage("success");
    else {
      setError(result.error);
      setStage("failed");
    }
  }

  const photoProblem = error && ["photo_no_face", "photo_multiple_faces", "photo_unclear", "face_mismatch", "photo_required"].includes(error);

  if (stage === "success") {
    return (
      <div className="bg-night noise relative animate-pop overflow-hidden rounded-[2rem] p-8 text-center text-white shadow-lift">
        <div className="bg-brand pointer-events-none absolute -top-24 left-1/2 size-72 -translate-x-1/2 rounded-full opacity-60 blur-3xl" />
        <div className="relative mx-auto flex size-20 animate-heartbeat items-center justify-center rounded-full bg-success shadow-[0_10px_40px_-8px_rgb(47_158_110/0.7)]">
          <CheckCircle2 className="size-10" />
        </div>
        <h2 className="relative mt-6 text-4xl">{t("successTitle")}</h2>
        <p className="relative mt-2 text-white/70">{t("successText")}</p>
        <Link href="/discover" className={buttonVariants({ size: "lg", className: "relative mt-8" })}>{t("toDiscover")}</Link>
      </div>
    );
  }

  if (stage === "live" && session) {
    return (
      <div className="space-y-3">
        <LivenessDetector
          sessionId={session.sessionId}
          region={session.region}
          locale={locale}
          onComplete={complete}
          onCancel={() => setStage("intro")}
          onError={() => { setError("liveness_failed"); setStage("failed"); }}
        />
      </div>
    );
  }

  if (stage === "checking") {
    return (
      <div className="flex flex-col items-center rounded-[2rem] bg-white/85 px-6 py-16 text-center shadow-soft ring-1 ring-white">
        <div className="relative flex size-20 items-center justify-center">
          <span className="bg-brand absolute inset-0 animate-ping rounded-full opacity-30" />
          <span className="bg-brand relative flex size-16 items-center justify-center rounded-full text-white shadow-glow"><ScanFace className="size-8" /></span>
        </div>
        <p className="mt-6 text-xl font-semibold">{t("checking")}</p>
      </div>
    );
  }

  const steps = [
    { icon: ImageIcon, title: t("stepPhoto"), text: t("stepPhotoText") },
    { icon: ScanFace, title: t("stepSelfie"), text: t("stepSelfieText") },
    { icon: Sparkles, title: t("stepMatch"), text: t("stepMatchText") },
  ];

  return (
    <div className="space-y-5">
      {stage === "failed" && error && (
        <Notice tone="danger" title={t("failedTitle")}>
          {errorText(error)}
          {photoProblem && <Link href="/settings/profile" className="mt-2 block font-semibold underline">{t("changePhoto")}</Link>}
        </Notice>
      )}

      <div className="grid gap-4 sm:grid-cols-[auto_1fr]">
        <div className="relative mx-auto w-40 sm:mx-0">
          <Photo src={coverPhoto} alt="" className="h-52 w-40 rounded-[1.75rem] shadow-lift" />
          <span className="bg-brand absolute -bottom-3 left-1/2 flex size-11 -translate-x-1/2 items-center justify-center rounded-full text-white shadow-glow ring-4 ring-ivory">
            <ScanFace className="size-5" />
          </span>
        </div>
        <ol className="space-y-3">
          {steps.map((s, i) => (
            <li key={s.title} className="flex gap-3 rounded-[1.5rem] bg-white/85 p-4 shadow-soft ring-1 ring-white">
              <span className={cn("squircle flex size-10 shrink-0 items-center justify-center text-white", ["bg-[#4f6bed]", "bg-brand", "bg-success"][i])}>
                <s.icon className="size-5" />
              </span>
              <span>
                <span className="block font-semibold">{s.title}</span>
                <span className="block text-sm text-muted">{s.text}</span>
              </span>
            </li>
          ))}
        </ol>
      </div>

      {!available ? (
        <Notice tone="warning" title={t("unavailableTitle")}>{errorText("verification_unavailable")}</Notice>
      ) : (
        <>
          <label className="flex items-start gap-3 rounded-[1.5rem] bg-white/85 p-4 text-[13px] leading-relaxed text-ink-soft shadow-soft ring-1 ring-white">
            <input type="checkbox" className="mt-1 size-4 shrink-0 accent-[var(--color-coral)]" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
            <span><ShieldCheck className="mr-1 inline size-4 text-success" />{t("consent")}</span>
          </label>
          <Button size="lg" className="w-full" disabled={!consent || !coverPhoto} loading={stage === "starting"} onClick={start}>
            {stage === "failed" ? <XCircle /> : <ScanFace />} {stage === "starting" ? t("starting") : stage === "failed" ? t("retry") : t("start")}
          </Button>
        </>
      )}
    </div>
  );
}
