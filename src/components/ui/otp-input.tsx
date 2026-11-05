"use client";
import { useRef } from "react";
import { cn } from "@/lib/utils";

/**
 * Six separate digit boxes. Supports typing, backspace navigation, pasting the
 * whole code and SMS/email autofill (autocomplete="one-time-code").
 */
export function OtpInput({ value, onChange, onComplete, length = 6, disabled, invalid, label }: {
  value: string; onChange: (v: string) => void; onComplete?: (v: string) => void;
  length?: number; disabled?: boolean; invalid?: boolean; label: string;
}) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = Array.from({ length }, (_, i) => value[i] ?? "");

  function set(next: string) {
    const clean = next.replace(/\D/g, "").slice(0, length);
    onChange(clean);
    if (clean.length === length) onComplete?.(clean);
    return clean;
  }

  return (
    <div className="flex justify-between gap-2" role="group" aria-label={label}>
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => { refs.current[i] = el; }}
          value={d}
          disabled={disabled}
          inputMode="numeric"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          autoFocus={i === 0}
          maxLength={length}
          aria-label={`${label} ${i + 1}`}
          aria-invalid={invalid}
          className={cn(
            "h-14 w-full min-w-0 rounded-2xl bg-ink/[0.045] text-center text-2xl font-bold tabular-nums text-ink transition-all focus:bg-white focus:outline-none focus:ring-4 focus:ring-coral/20 disabled:opacity-50 sm:h-16",
            d && "bg-white ring-2 ring-coral/40",
            invalid && "bg-danger/5 ring-2 ring-danger/50",
          )}
          onChange={(e) => {
            const typed = e.target.value.replace(/\D/g, "");
            if (!typed) return;
            // Paste / autofill of the whole code into any box.
            const next = typed.length > 1 ? set(typed) : set(value.slice(0, i) + typed + value.slice(i + 1));
            refs.current[Math.min(next.length, length - 1)]?.focus();
          }}
          onKeyDown={(e) => {
            if (e.key === "Backspace") {
              e.preventDefault();
              if (d) set(value.slice(0, i) + value.slice(i + 1));
              else if (i > 0) {
                set(value.slice(0, i - 1) + value.slice(i));
                refs.current[i - 1]?.focus();
              }
            } else if (e.key === "ArrowLeft" && i > 0) refs.current[i - 1]?.focus();
            else if (e.key === "ArrowRight" && i < length - 1) refs.current[i + 1]?.focus();
          }}
          onFocus={(e) => e.target.select()}
        />
      ))}
    </div>
  );
}
