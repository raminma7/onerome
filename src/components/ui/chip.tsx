"use client";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export function Chip({ selected, onClick, children, disabled, size = "md" }: { selected?: boolean; onClick?: () => void; children: React.ReactNode; disabled?: boolean; size?: "sm" | "md" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={selected}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full font-medium transition-all duration-200 active:scale-95 disabled:opacity-35",
        size === "sm" ? "px-3.5 py-1.5 text-[13px]" : "px-4 py-2.5 text-sm",
        selected ? "bg-ink text-white shadow-soft" : "bg-white text-ink-soft ring-1 ring-ink/10 hover:ring-ink/25",
      )}
    >
      {selected && <Check className="size-3.5 animate-pop" strokeWidth={3} />}
      {children}
    </button>
  );
}
