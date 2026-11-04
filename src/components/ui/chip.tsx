"use client";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export function Chip({ selected, onClick, children, disabled }: { selected?: boolean; onClick?: () => void; children: React.ReactNode; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={selected}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm transition-all disabled:opacity-40",
        selected ? "border-bordeaux bg-bordeaux text-ivory" : "border-line bg-white/70 text-ink-soft hover:border-ink/25",
      )}
    >
      {selected && <Check className="size-3.5" />}
      {children}
    </button>
  );
}
