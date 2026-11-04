"use client";
import { BellRing } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { publicEnv } from "@/lib/env";
import { useErrorText } from "@/lib/use-action";
import { savePushSubscriptionAction } from "@/server/actions/notifications";
import { toast } from "sonner";

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

type State = "unknown" | "unsupported" | "denied" | "enabled" | "available";

/** Asks permission only after an explicit user gesture, as browsers require. */
export function PushToggle() {
  const t = useTranslations("notifications");
  const errorText = useErrorText();
  const [state, setState] = useState<State>("unknown");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let next: State;
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) next = "unsupported";
      else if (Notification.permission === "denied") next = "denied";
      else {
        const reg = await navigator.serviceWorker.getRegistration();
        next = (await reg?.pushManager.getSubscription()) ? "enabled" : "available";
      }
      if (!cancelled) setState(next);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function enable() {
    setBusy(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState("denied");
        return;
      }
      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(publicEnv.vapidPublicKey) });
      const json = sub.toJSON();
      const result = await savePushSubscriptionAction({ endpoint: json.endpoint, keys: json.keys, userAgent: navigator.userAgent });
      if (!result.ok) toast.error(errorText(result.error));
      else setState("enabled");
    } catch {
      toast.error(errorText("generic"));
    } finally {
      setBusy(false);
    }
  }

  if (state === "unknown") return <span />;
  if (state === "unsupported") return <p className="text-xs text-muted">{t("pushUnsupported")}</p>;
  if (state === "denied") return <p className="text-xs text-muted">{t("pushDenied")}</p>;
  if (state === "enabled") return <p className="flex items-center gap-2 text-sm text-success"><BellRing className="size-4" /> {t("pushEnabled")}</p>;
  return <Button variant="outline" size="sm" loading={busy} onClick={enable}><BellRing /> {t("enablePush")}</Button>;
}
