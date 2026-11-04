export function PageHeader({ title, subtitle, action }: { title: React.ReactNode; subtitle?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <header className="mb-6 flex items-end justify-between gap-4 animate-fade-up">
      <div>
        <h1 className="text-4xl leading-none sm:text-5xl">{title}</h1>
        {subtitle && <p className="mt-2 text-muted">{subtitle}</p>}
      </div>
      {action}
    </header>
  );
}

export function EmptyState({ icon, title, text, children }: { icon?: React.ReactNode; title: React.ReactNode; text?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-[var(--radius-card)] border border-dashed border-line bg-white/40 px-6 py-14 text-center">
      {icon && <div className="mb-4 flex size-14 items-center justify-center rounded-full bg-cream text-bordeaux [&_svg]:size-6">{icon}</div>}
      <h2 className="text-2xl">{title}</h2>
      {text && <p className="mt-2 max-w-sm text-sm text-muted">{text}</p>}
      {children && <div className="mt-6">{children}</div>}
    </div>
  );
}
