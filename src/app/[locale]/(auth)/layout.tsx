import { Heart } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { LanguageSwitcher } from "@/components/language-switcher";
import { Logo } from "@/components/logo";
import { Link } from "@/i18n/navigation";

export default async function AuthLayout({ children }: LayoutProps<"/[locale]">) {
  const t = await getTranslations("landing");
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1fr_1.05fr]">
      {/* Art panel */}
      <aside className="bg-night noise relative hidden overflow-hidden p-10 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="pointer-events-none absolute -left-32 -top-32 size-[34rem] animate-aurora rounded-full bg-[radial-gradient(circle,rgb(224_56_75/0.5),transparent_60%)]" />
        <div className="pointer-events-none absolute -bottom-40 -right-20 size-[30rem] animate-aurora rounded-full bg-[radial-gradient(circle,rgb(255_176_103/0.35),transparent_60%)] [animation-delay:-8s]" />
        <Link href="/" className="relative"><Logo light /></Link>
        <div className="relative">
          <div className="bg-brand mb-8 flex size-14 animate-heartbeat items-center justify-center rounded-2xl shadow-glow"><Heart className="size-6" fill="currentColor" /></div>
          <p className="max-w-md whitespace-pre-line font-display text-6xl leading-[0.95]">
            {t("title").split("\n").map((l, i, a) => <span key={i} className={i === a.length - 1 ? "block italic text-brand-light" : "block"}>{l}</span>)}
          </p>
          <p className="mt-6 max-w-sm text-white/60">{t("rule72Text")}</p>
        </div>
        <p className="relative text-xs text-white/40">{t("madeIn")}</p>
      </aside>

      {/* Form panel */}
      <div className="bg-ambient flex flex-col">
        <header className="flex items-center justify-between px-5 py-5 sm:px-8">
          <Link href="/" aria-label="OneRome" className="lg:invisible"><Logo /></Link>
          <LanguageSwitcher />
        </header>
        <main className="flex flex-1 items-start justify-center px-4 pb-16 pt-2 sm:items-center">
          <div className="w-full max-w-[420px] animate-fade-up rounded-[2.25rem] bg-white/80 p-7 shadow-lift ring-1 ring-white backdrop-blur-xl sm:p-10 [&_h1]:text-5xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
