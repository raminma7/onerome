import { cn } from "@/lib/utils";

/** Wordmark: gradient arch-heart mark + "OneRome". */
export function Logo({ className, light }: { className?: string; light?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2 font-display text-[1.45rem] leading-none tracking-tight", light ? "text-white" : "text-ink", className)}>
      <span className="bg-brand squircle flex size-[1.25em] items-center justify-center shadow-glow">
        <svg viewBox="0 0 24 24" className="size-[0.8em] text-white" aria-hidden>
          <path d="M5 21V11a7 7 0 0 1 14 0v10" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
          <path d="M12 17.5s-3.2-1.9-3.2-4.1a1.75 1.75 0 0 1 3.2-1 1.75 1.75 0 0 1 3.2 1c0 2.2-3.2 4.1-3.2 4.1z" fill="currentColor" />
        </svg>
      </span>
      <span>
        One<span className="text-brand">Rome</span>
      </span>
    </span>
  );
}
