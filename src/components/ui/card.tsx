import * as React from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-[var(--radius-card)] border border-line/70 bg-white/80 shadow-soft backdrop-blur", className)} {...props} />;
}

export function Badge({ className, tone = "neutral", ...props }: React.HTMLAttributes<HTMLSpanElement> & { tone?: "neutral" | "bordeaux" | "gold" | "success" | "danger" }) {
  const tones = {
    neutral: "bg-cream text-ink-soft",
    bordeaux: "bg-bordeaux-soft text-bordeaux-dark",
    gold: "bg-gold-soft text-[#7a5a2c]",
    success: "bg-[#e5efe6] text-success",
    danger: "bg-[#f6e1e1] text-danger",
  } as const;
  return <span className={cn("inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium [&_svg]:size-3.5", tones[tone], className)} {...props} />;
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-2xl bg-travertine/70", className)} />;
}

export function Progress({ value, className }: { value: number; className?: string }) {
  return (
    <div className={cn("h-1.5 w-full overflow-hidden rounded-full bg-travertine", className)} role="progressbar" aria-valuenow={Math.round(value)} aria-valuemin={0} aria-valuemax={100}>
      <div className="h-full rounded-full bg-bordeaux transition-[width] duration-500" style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  );
}

export function Notice({ tone = "neutral", title, children, className }: { tone?: "neutral" | "warning" | "danger" | "success"; title?: React.ReactNode; children?: React.ReactNode; className?: string }) {
  const tones = {
    neutral: "border-line bg-cream/70",
    warning: "border-gold/40 bg-gold-soft/70",
    danger: "border-danger/30 bg-[#f8e8e8]",
    success: "border-success/30 bg-[#e8f1ea]",
  } as const;
  return (
    <div className={cn("rounded-2xl border px-4 py-3 text-sm", tones[tone], className)} role={tone === "danger" ? "alert" : "status"}>
      {title && <p className="font-medium text-ink">{title}</p>}
      {children && <div className="mt-0.5 text-ink-soft">{children}</div>}
    </div>
  );
}
