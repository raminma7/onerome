import * as React from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-[var(--radius-card)] border border-white/70 bg-white/75 shadow-soft backdrop-blur-xl", className)} {...props} />;
}

type Tone = "neutral" | "bordeaux" | "gold" | "success" | "danger" | "glass" | "dark" | "brand";
export function Badge({ className, tone = "neutral", ...props }: React.HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  const tones: Record<Tone, string> = {
    neutral: "bg-ink/[0.06] text-ink-soft",
    bordeaux: "bg-bordeaux-soft text-bordeaux",
    gold: "bg-gold-soft text-[#8a5a1c]",
    success: "bg-success/10 text-success",
    danger: "bg-danger/10 text-danger",
    glass: "glass-dark text-white",
    dark: "bg-ink text-white",
    brand: "bg-brand text-white",
  };
  return <span className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold [&_svg]:size-3.5", tones[tone], className)} {...props} />;
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("shimmer animate-shimmer rounded-2xl bg-travertine/70", className)} />;
}

export function Progress({ value, className }: { value: number; className?: string }) {
  return (
    <div className={cn("h-1.5 w-full overflow-hidden rounded-full bg-ink/[0.07]", className)} role="progressbar" aria-valuenow={Math.round(value)} aria-valuemin={0} aria-valuemax={100}>
      <div className="bg-brand h-full rounded-full transition-[width] duration-700 ease-out" style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  );
}

/** Circular progress ring (compatibility score, countdowns). */
export function Ring({ value, size = 56, stroke = 5, className, children, track = "rgb(23 17 15 / 0.08)" }: {
  value: number; size?: number; stroke?: number; className?: string; children?: React.ReactNode; track?: string;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.min(100, Math.max(0, value));
  const id = React.useId();
  return (
    <div className={cn("relative inline-flex items-center justify-center", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#e0384b" />
            <stop offset="1" stopColor="#ffb067" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={`url(#${id})`} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c - (pct / 100) * c} style={{ transition: "stroke-dashoffset 1s cubic-bezier(.22,1,.36,1)" }} />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">{children}</div>
    </div>
  );
}

export function Notice({ tone = "neutral", title, children, className }: { tone?: "neutral" | "warning" | "danger" | "success"; title?: React.ReactNode; children?: React.ReactNode; className?: string }) {
  const tones = {
    neutral: "bg-ink/[0.04] text-ink-soft",
    warning: "bg-gold-soft text-[#7a4f17]",
    danger: "bg-danger/8 text-danger",
    success: "bg-success/10 text-success",
  } as const;
  return (
    <div className={cn("rounded-2xl px-4 py-3 text-sm", tones[tone], className)} role={tone === "danger" ? "alert" : "status"}>
      {title && <p className="font-semibold text-ink">{title}</p>}
      {children && <div className={cn(title && "mt-0.5")}>{children}</div>}
    </div>
  );
}

/** Coloured squircle icon used in lists (iOS settings style). */
export function IconTile({ children, className }: { children: React.ReactNode; className?: string }) {
  return <span className={cn("squircle flex size-9 shrink-0 items-center justify-center text-white [&_svg]:size-[18px]", className ?? "bg-brand")}>{children}</span>;
}
