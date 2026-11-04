import { toLocale } from "@/i18n/routing";
import { CalendarHeart, Clock3, HeartHandshake, MessageCircleHeart, ShieldCheck, Sparkles, UserRound } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { buttonVariants } from "@/components/ui/button";
import { LanguageSwitcher } from "@/components/language-switcher";
import { Logo } from "@/components/logo";
import { Link } from "@/i18n/navigation";
import { getUserId } from "@/lib/auth";

export default async function Landing({ params }: PageProps<"/[locale]">) {
  const locale = toLocale((await params).locale);
  setRequestLocale(locale);
  const t = await getTranslations("landing");
  const nav = await getTranslations("nav");
  const signedIn = Boolean(await getUserId());

  const steps = [
    { icon: UserRound, title: t("how1Title"), text: t("how1Text") },
    { icon: Sparkles, title: t("how2Title"), text: t("how2Text") },
    { icon: HeartHandshake, title: t("how3Title"), text: t("how3Text") },
    { icon: MessageCircleHeart, title: t("how4Title"), text: t("how4Text") },
  ];

  return (
    <div className="bg-travertine-texture min-h-dvh">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
        <Logo />
        <div className="flex items-center gap-3">
          <LanguageSwitcher />
          <Link href={signedIn ? "/discover" : "/login"} className={buttonVariants({ variant: "ghost", size: "sm", className: "hidden sm:inline-flex" })}>
            {signedIn ? nav("discover") : nav("login")}
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto grid max-w-6xl items-center gap-12 px-5 pb-20 pt-6 sm:px-8 md:grid-cols-[1.1fr_1fr] md:pt-14">
        <div className="animate-fade-up">
          <p className="mb-5 text-xs font-medium uppercase tracking-[0.25em] text-gold">{t("eyebrow")}</p>
          <h1 className="whitespace-pre-line text-5xl leading-[0.95] sm:text-7xl">{t("title")}</h1>
          <p className="mt-6 max-w-lg text-lg leading-relaxed text-ink-soft">{t("subtitle")}</p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Link href={signedIn ? "/discover" : "/register"} className={buttonVariants({ size: "lg" })}>
              {signedIn ? nav("discover") : t("ctaPrimary")}
            </Link>
            {!signedIn && (
              <Link href="/login" className={buttonVariants({ variant: "outline", size: "lg" })}>{t("ctaSecondary")}</Link>
            )}
          </div>
          <p className="mt-4 text-sm text-muted">{t("freeNote")}</p>
        </div>

        <div className="relative mx-auto h-[440px] w-full max-w-sm animate-fade-in sm:h-[520px]" aria-hidden>
          <div className="arch absolute inset-x-6 bottom-0 top-0 overflow-hidden bg-gradient-to-b from-[#d9a77a] via-[#b4644f] to-[#5c1520] shadow-lift">
            <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[#2a1210]/70 to-transparent" />
            {/* Stylised skyline: dome, columns, umbrella pines */}
            <svg viewBox="0 0 300 200" className="absolute inset-x-0 bottom-0 w-full text-[#2a1210]/80" fill="currentColor">
              <path d="M0 200V150h20v-6h10v6h14v-20h6v20h30v-30c0-18 14-34 34-38v-8h4v8c20 4 34 20 34 38v30h30v-24h8v24h20v-12c10-8 30-8 40 0v12h30v50z" />
              <ellipse cx="248" cy="118" rx="34" ry="12" />
              <rect x="246" y="118" width="4" height="40" />
              <ellipse cx="40" cy="128" rx="26" ry="10" />
              <rect x="38" y="128" width="4" height="30" />
            </svg>
            <div className="absolute left-1/2 top-16 size-20 -translate-x-1/2 rounded-full bg-[#f6d9a8]/80 blur-[2px]" />
          </div>
          <div className="absolute -left-2 bottom-10 rounded-2xl bg-ivory/95 px-4 py-3 shadow-lift">
            <p className="text-xs text-muted">{t("rule72Title")}</p>
            <p className="font-display text-2xl text-bordeaux">72h</p>
          </div>
          <div className="absolute -right-2 top-14 flex items-center gap-2 rounded-full bg-ivory/95 px-4 py-2 text-sm shadow-lift">
            <HeartHandshake className="size-4 text-bordeaux" /> 1 : 1
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-y border-line/60 bg-ivory/70">
        <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8">
          <h2 className="text-4xl sm:text-5xl">{t("howTitle")}</h2>
          <ol className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((s, i) => (
              <li key={i} className="rounded-[var(--radius-card)] border border-line/70 bg-white/70 p-6">
                <div className="flex items-center justify-between">
                  <s.icon className="size-6 text-bordeaux" />
                  <span className="font-display text-3xl text-gold/70">{String(i + 1).padStart(2, "0")}</span>
                </div>
                <h3 className="mt-6 text-2xl">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{s.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Highlights */}
      <section className="mx-auto grid max-w-6xl gap-6 px-5 py-20 sm:px-8 md:grid-cols-3">
        {[
          { icon: Clock3, title: t("rule72Title"), text: t("rule72Text") },
          { icon: CalendarHeart, title: t("firstDateTitle"), text: t("firstDateText") },
          { icon: ShieldCheck, title: t("safetyTitle"), text: t("safetyText") },
        ].map((f, i) => (
          <div key={i} className="p-2">
            <div className="flex size-12 items-center justify-center rounded-full bg-bordeaux-soft text-bordeaux"><f.icon className="size-5" /></div>
            <h3 className="mt-5 text-3xl">{f.title}</h3>
            <p className="mt-2 leading-relaxed text-muted">{f.text}</p>
          </div>
        ))}
      </section>

      {/* Pricing */}
      <section className="px-5 pb-24 sm:px-8">
        <div className="mx-auto max-w-3xl rounded-[2rem] bg-ink px-8 py-12 text-ivory shadow-lift sm:px-14">
          <p className="text-xs uppercase tracking-[0.25em] text-gold">{t("priceTitle")}</p>
          <p className="mt-4 font-display text-6xl">{t("price")}<span className="text-2xl text-ivory/60"> {t("pricePeriod")}</span></p>
          <p className="mt-4 max-w-lg text-ivory/75">{t("priceText")}</p>
          <ul className="mt-6 grid gap-2 sm:grid-cols-3">
            {(t.raw("priceFeatures") as string[]).map((f) => (
              <li key={f} className="rounded-full border border-ivory/15 px-4 py-2 text-center text-sm text-ivory/85">{f}</li>
            ))}
          </ul>
          <Link href={signedIn ? "/billing" : "/register"} className={buttonVariants({ size: "lg", className: "mt-8" })}>{t("ctaPrimary")}</Link>
        </div>
      </section>

      <footer className="border-t border-line/60">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-8 text-sm text-muted sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <Logo className="text-xl" />
          <nav className="flex gap-6">
            <Link href="/privacy" className="hover:text-ink">{t("privacy")}</Link>
            <Link href="/terms" className="hover:text-ink">{t("terms")}</Link>
          </nav>
          <p>{t("madeIn")} · © {new Date().getFullYear()}</p>
        </div>
      </footer>
    </div>
  );
}
