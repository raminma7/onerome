import { cn } from "@/lib/utils";

/** Wordmark with a small Roman arch as the "O". */
export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 font-display text-2xl tracking-tight text-ink", className)}>
      <svg viewBox="0 0 24 28" className="h-[1.05em] w-auto text-bordeaux" aria-hidden>
        <path d="M3 27V12a9 9 0 0 1 18 0v15" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
        <path d="M8 27v-9a4 4 0 0 1 8 0v9" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" opacity=".55" />
      </svg>
      <span>
        One<span className="text-bordeaux">Rome</span>
      </span>
    </span>
  );
}
