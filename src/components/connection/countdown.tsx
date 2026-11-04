"use client";
import { useNow, useTranslations } from "next-intl";
import { Ring } from "@/components/ui/card";

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

/** Large ring showing how much of the 72h window is left. */
export function TimerRing({ since, deadline, size = 132 }: { since: string; deadline: string; size?: number }) {
  const now = useNow({ updateInterval: 60_000 });
  const start = new Date(since).getTime();
  const end = new Date(deadline).getTime();
  const left = Math.max(0, end - now.getTime());
  const pct = Math.min(100, Math.max(0, (left / (end - start)) * 100));
  const hours = Math.floor(left / 3_600_000);
  return (
    <Ring value={pct} size={size} stroke={size < 90 ? 6 : 9} track="rgb(255 255 255 / 0.12)">
      <span className="text-center leading-none text-white">
        <span className={size < 90 ? "block font-display text-3xl" : "block font-display text-5xl"}>{hours}</span>
        <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/60">h</span>
      </span>
    </Ring>
  );
}
