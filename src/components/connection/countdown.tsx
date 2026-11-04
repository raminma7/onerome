"use client";
import { useNow, useTranslations } from "next-intl";

export function formatRemaining(ms: number) {
  const totalMinutes = Math.max(0, Math.floor(ms / 60_000));
  const d = Math.floor(totalMinutes / 1440);
  const h = Math.floor((totalMinutes % 1440) / 60);
  const m = totalMinutes % 60;
  return d > 0 ? `${d}d ${h}h` : h > 0 ? `${h}h ${m}m` : `${m}m`;
}

/** "Closes automatically in 2d 5h", refreshed every minute. */
export function Countdown({ deadline }: { deadline: string }) {
  const t = useTranslations("connection");
  const now = useNow({ updateInterval: 60_000 });
  return <>{t("timeLeft", { time: formatRemaining(new Date(deadline).getTime() - now.getTime()) })}</>;
}

export function TimerBar({ since, deadline }: { since: string; deadline: string }) {
  const now = useNow({ updateInterval: 60_000 });
  const start = new Date(since).getTime();
  const end = new Date(deadline).getTime();
  const pct = Math.min(100, Math.max(0, ((now.getTime() - start) / (end - start)) * 100));
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-travertine">
      <div className={`h-full rounded-full transition-[width] ${pct > 66 ? "bg-danger" : pct > 40 ? "bg-gold" : "bg-olive"}`} style={{ width: `${pct}%` }} />
    </div>
  );
}
