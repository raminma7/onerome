import { cn } from "@/lib/utils";

export function PageHeader({ title, subtitle, action, eyebrow, className }: { title: React.ReactNode; subtitle?: React.ReactNode; action?: React.ReactNode; eyebrow?: React.ReactNode; className?: string }) {
  return (
    <header className={cn("mb-7 flex animate-fade-up items-end justify-between gap-4", className)}>
      <div>
        {eyebrow && <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-coral">{eyebrow}</p>}
        <h1 className="text-[2.75rem] sm:text-6xl">{title}</h1>
        {subtitle && <p className="mt-2 max-w-xl text-[15px] text-muted">{subtitle}</p>}
      </div>
      {action}
    </header>
  );
}

export function EmptyState({ icon, title, text, children }: { icon?: React.ReactNode; title: React.ReactNode; text?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div className="relative flex animate-fade-up flex-col items-center overflow-hidden rounded-[2rem] bg-white/70 px-6 py-16 text-center shadow-soft ring-1 ring-white">
      <div className="bg-brand-soft pointer-events-none absolute -top-24 left-1/2 size-72 -translate-x-1/2 rounded-full blur-3xl" />
      {icon && (
        <div className="bg-brand relative mb-6 flex size-16 animate-float items-center justify-center rounded-[1.4rem] text-white shadow-glow [&_svg]:size-7">
          {icon}
        </div>
      )}
      <h2 className="relative text-4xl">{title}</h2>
      {text && <p className="relative mt-3 max-w-sm text-[15px] leading-relaxed text-muted">{text}</p>}
      {children && <div className="relative mt-7">{children}</div>}
    </div>
  );
}
