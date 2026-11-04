import { ArrowRight, CalendarHeart, Check, Clock3, HeartHandshake, MessageCircleHeart, ShieldCheck, Sparkles, UserRound } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { LanguageSwitcher } from "@/components/language-switcher";
import { Logo } from "@/components/logo";
import { buttonVariants } from "@/components/ui/button";
import { Ring } from "@/components/ui/card";
import { Link } from "@/i18n/navigation";
import { toLocale } from "@/i18n/routing";
import { getUserId } from "@/lib/auth";
import { cn } from "@/lib/utils";

const HOODS = ["Trastevere", "Monti", "Testaccio", "Prati", "Pigneto", "San Lorenzo", "Garbatella", "Ostiense", "Parioli", "Monteverde", "Esquilino", "Flaminio", "EUR", "Centro Storico", "Aventino", "Ponte Milvio"];

/** Pure-CSS phone mockup showing the product (no fake people photos). */
function PhoneMockup({ t }: { t: (k: "mockMatch" | "mockMessage1" | "mockMessage2" | "rule72Title") => string }) {
  return (
    <div className="relative mx-auto w-[290px] sm:w-[320px]">
      <div className="bg-brand absolute -inset-10 rounded-full opacity-40 blur-3xl" />
      <div className="relative rotate-[-4deg] rounded-[3rem] border border-white/15 bg-night-2 p-2.5 shadow-[0_40px_80px_-20px_rgb(0_0_0/0.6)]">
        <div className="relative h-[560px] overflow-hidden rounded-[2.5rem] bg-ivory sm:h-[600px]">
          <div className="absolute left-1/2 top-2.5 z-20 h-6 w-24 -translate-x-1/2 rounded-full bg-night" />
          {/* app card */}
          <div className="absolute inset-x-3 bottom-24 top-12 overflow-hidden rounded-[2rem] shadow-lift"
            style={{ background: "radial-gradient(60% 50% at 25% 20%, #ff6a88 0%, transparent 70%), radial-gradient(60% 50% at 85% 35%, #ffb067 0%, transparent 70%), radial-gradient(70% 60% at 50% 90%, #8e1838 0%, transparent 70%), #e0384b" }}>
            <svg viewBox="0 0 300 200" className="absolute inset-x-0 bottom-0 w-full fill-black/25">
              <path d="M0 200V150h20v-6h10v6h14v-20h6v20h30v-30c0-18 14-34 34-38v-8h4v8c20 4 34 20 34 38v30h30v-24h8v24h20v-12c10-8 30-8 40 0v12h30v50z" />
            </svg>
            <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/70 to-transparent" />
            <div className="absolute inset-x-4 top-3 flex gap-1">{[0, 1, 2].map((i) => <span key={i} className={cn("h-[3px] flex-1 rounded-full", i ? "bg-white/40" : "bg-white")} />)}</div>
            <div className="glass-dark absolute right-3 top-6 flex items-center gap-1.5 rounded-full py-0.5 pl-0.5 pr-2.5 text-xs font-bold text-white">
              <Ring value={87} size={26} stroke={3} track="rgb(255 255 255 / 0.2)"><Sparkles className="size-3 text-apricot" /></Ring>87%
            </div>
            <div className="absolute inset-x-4 bottom-4 text-white">
              <p className="font-display text-3xl">Giulia <span className="font-sans text-xl font-light">31</span></p>
              <div className="mt-2 flex gap-1.5 text-[11px] font-medium">
                <span className="glass-dark rounded-full px-2.5 py-1">Monti</span>
                <span className="glass-dark rounded-full px-2.5 py-1">Arte · Cinema</span>
              </div>
            </div>
          </div>
          <div className="absolute inset-x-0 bottom-6 flex items-center justify-center gap-4">
            <span className="flex size-12 items-center justify-center rounded-full bg-white text-ink-soft shadow-lift">✕</span>
            <span className="bg-brand flex size-14 items-center justify-center rounded-full text-white shadow-glow"><HeartHandshake className="size-6" /></span>
            <span className="flex size-12 items-center justify-center rounded-full bg-white text-ink-soft shadow-lift">⌄</span>
          </div>
        </div>
      </div>
      {/* floating UI fragments */}
      <div className="glass absolute -left-14 top-24 hidden animate-float rounded-2xl px-4 py-3 shadow-lift [--r:-6deg] sm:block">
        <p className="font-display text-2xl text-brand">{t("mockMatch")}</p>
      </div>
      <div className="glass absolute -right-12 top-56 hidden w-48 animate-float rounded-2xl rounded-br-md px-3.5 py-2.5 text-[13px] text-ink shadow-lift [--r:4deg] [animation-delay:1s] sm:block">
        {t("mockMessage1")}
      </div>
      <div className="bg-brand absolute -right-6 top-[19rem] hidden w-44 animate-float rounded-2xl rounded-bl-md px-3.5 py-2.5 text-[13px] text-white shadow-glow [--r:2deg] [animation-delay:2s] sm:block">
        {t("mockMessage2")}
      </div>
      <div className="glass absolute -left-10 bottom-28 hidden animate-float items-center gap-3 rounded-2xl px-3 py-2.5 shadow-lift [--r:3deg] [animation-delay:1.5s] sm:flex">
        <Ring value={66} size={40} stroke={4}><Clock3 className="size-4 text-coral" /></Ring>
        <span className="text-sm font-semibold text-ink">72h</span>
      </div>
    </div>
  );
}

export default async function Landing({ params }: PageProps<"/[locale]">) {
  const locale = toLocale((await params).locale);
  setRequestLocale(locale);
  const t = await getTranslations("landing");
  const nav = await getTranslations("nav");
  const signedIn = Boolean(await getUserId());
  const primaryHref = signedIn ? "/discover" : "/register";

  const steps = [
    { icon: UserRound, title: t("how1Title"), text: t("how1Text") },
    { icon: Sparkles, title: t("how2Title"), text: t("how2Text") },
    { icon: HeartHandshake, title: t("how3Title"), text: t("how3Text") },
    { icon: MessageCircleHeart, title: t("how4Title"), text: t("how4Text") },
  ];

  return (
    <div className="min-h-dvh bg-ivory">
      {/* HERO */}
      <section className="bg-night noise relative overflow-hidden text-white">
        <div className="pointer-events-none absolute -left-40 -top-40 size-[40rem] animate-aurora rounded-full bg-[radial-gradient(circle,rgb(224_56_75/0.45),transparent_60%)]" />
        <div className="pointer-events-none absolute -bottom-40 right-0 size-[36rem] animate-aurora rounded-full bg-[radial-gradient(circle,rgb(255_176_103/0.3),transparent_60%)] [animation-delay:-6s]" />

        <div className="relative z-10 px-4 pt-4 sm:px-6">
          <header className="glass-dark mx-auto flex h-14 max-w-6xl items-center justify-between rounded-full pl-5 pr-2 sm:h-16">
            <Logo light className="text-2xl" />
            <div className="flex items-center gap-2">
              <LanguageSwitcher dark />
              <Link href={signedIn ? "/discover" : "/login"} className={buttonVariants({ variant: "light", size: "sm", className: "hidden sm:inline-flex" })}>
                {signedIn ? nav("discover") : nav("login")}
              </Link>
            </div>
          </header>
        </div>

        <div className="relative z-10 mx-auto grid max-w-6xl items-center gap-16 px-5 pb-24 pt-14 sm:px-8 lg:grid-cols-[1.15fr_1fr] lg:pt-20">
          <div className="animate-fade-up">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-white/85 ring-1 ring-white/15">
              <span className="size-1.5 animate-pulse rounded-full bg-coral" /> {t("badge")}
            </span>
            <h1 className="mt-6 whitespace-pre-line text-[3.1rem] leading-[0.95] sm:text-[4.6rem]">
              {t("title").split("\n").map((line, i, all) => (
                <span key={i} className={cn("block", i === all.length - 1 && "text-brand-light")}>{line}</span>
              ))}
            </h1>
            <p className="mt-7 max-w-lg text-lg leading-relaxed text-white/70">{t("subtitle")}</p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link href={primaryHref} className={buttonVariants({ size: "lg" })}>
                {signedIn ? nav("discover") : t("ctaPrimary")} <ArrowRight />
              </Link>
              {!signedIn && (
                <Link href="/login" className={buttonVariants({ size: "lg", variant: "ghost", className: "text-white ring-1 ring-white/20 hover:bg-white/10" })}>
                  {t("ctaSecondary")}
                </Link>
              )}
            </div>
            <div className="mt-10 grid max-w-lg grid-cols-3 gap-4 border-t border-white/10 pt-7">
              {[["1", t("statExclusive")], ["72", t("statHours")], ["0€", t("statFree")]].map(([n, label]) => (
                <div key={label}>
                  <p className="font-display text-4xl text-brand-light">{n}</p>
                  <p className="mt-1 text-xs leading-snug text-white/55">{label}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="animate-fade-in [animation-delay:200ms]">
            <PhoneMockup t={(k) => t(k)} />
          </div>
        </div>

        {/* Neighbourhood marquee */}
        <div className="relative z-10 border-t border-white/10 py-5">
          <div className="mask-fade-x overflow-hidden">
            <div className="flex w-max animate-marquee gap-10 whitespace-nowrap font-display text-2xl text-white/40">
              {[...HOODS, ...HOODS].map((h, i) => <span key={i} className="flex items-center gap-10">{h}<span className="text-coral">✦</span></span>)}
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="bg-ambient">
        <div className="mx-auto max-w-6xl px-5 py-24 sm:px-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-coral">OneRome</p>
          <h2 className="mt-3 text-5xl sm:text-6xl">{t("howTitle")}</h2>
          <ol className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((s, i) => (
              <li key={i} className="group relative overflow-hidden rounded-[2rem] bg-white/80 p-7 shadow-soft ring-1 ring-white transition duration-500 hover:-translate-y-1 hover:shadow-lift">
                <span className="absolute -right-3 -top-6 font-display text-[7rem] leading-none text-ink/[0.04]">{i + 1}</span>
                <div className="bg-brand flex size-12 items-center justify-center rounded-2xl text-white shadow-glow"><s.icon className="size-5" /></div>
                <h3 className="mt-7 text-[1.75rem]">{s.title}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-muted">{s.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* BENTO */}
      <section className="mx-auto max-w-6xl px-5 pb-24 sm:px-8">
        <div className="grid gap-4 lg:grid-cols-3 lg:grid-rows-2">
          <div className="bg-night noise relative overflow-hidden rounded-[2rem] p-8 text-white lg:col-span-2 lg:row-span-1">
            <div className="bg-brand absolute -right-20 -top-20 size-72 rounded-full opacity-50 blur-3xl" />
            <div className="relative flex h-full flex-col justify-between gap-10 sm:flex-row sm:items-end">
              <div className="max-w-md">
                <Clock3 className="size-8 text-apricot" />
                <h3 className="mt-5 text-5xl">{t("rule72Title")}</h3>
                <p className="mt-3 text-white/70">{t("rule72Text")}</p>
              </div>
              <Ring value={68} size={150} stroke={10} track="rgb(255 255 255 / 0.1)">
                <span className="text-center"><span className="block font-display text-5xl">72</span><span className="text-xs uppercase tracking-widest text-white/60">h</span></span>
              </Ring>
            </div>
          </div>
          <div className="bg-brand relative overflow-hidden rounded-[2rem] p-8 text-white shadow-glow lg:row-span-2">
            <CalendarHeart className="size-8" />
            <h3 className="mt-5 text-5xl">{t("firstDateTitle")}</h3>
            <p className="mt-3 text-white/85">{t("firstDateText")}</p>
            <div className="mt-8 space-y-2.5">
              {["☕ Sant'Eustachio", "🍝 Trastevere", "🏛️ Musei Capitolini", "🍦 Monti", "🌅 Giardino degli Aranci"].map((v, i) => (
                <div key={v} className="rounded-2xl bg-white/15 px-4 py-3 text-sm font-medium backdrop-blur" style={{ marginLeft: `${(i % 2) * 1.5}rem` }}>{v}</div>
              ))}
            </div>
          </div>
          <div className="rounded-[2rem] bg-white/80 p-8 shadow-soft ring-1 ring-white">
            <ShieldCheck className="size-8 text-coral" />
            <h3 className="mt-5 text-4xl">{t("safetyTitle")}</h3>
            <p className="mt-3 text-[15px] text-muted">{t("safetyText")}</p>
          </div>
          <div className="bg-brand-soft rounded-[2rem] p-8">
            <MessageCircleHeart className="size-8 text-bordeaux" />
            <h3 className="mt-5 text-4xl">{t("how4Title")}</h3>
            <p className="mt-3 text-[15px] text-ink-soft">{t("how4Text")}</p>
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section className="px-5 pb-24 sm:px-8">
        <div className="bg-brand mx-auto max-w-3xl rounded-[2.5rem] p-[1.5px] shadow-lift">
          <div className="rounded-[calc(2.5rem-1.5px)] bg-ivory px-8 py-12 text-center sm:px-14">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-coral">{t("priceTitle")}</p>
            <p className="mt-4 font-display text-7xl">{t("price")}<span className="font-sans text-xl text-muted"> {t("pricePeriod")}</span></p>
            <p className="mx-auto mt-4 max-w-lg text-muted">{t("priceText")}</p>
            <ul className="mx-auto mt-8 flex max-w-xl flex-wrap justify-center gap-2">
              {(t.raw("priceFeatures") as string[]).map((f) => (
                <li key={f} className="inline-flex items-center gap-2 rounded-full bg-ink/[0.05] px-4 py-2 text-sm font-medium"><Check className="size-4 text-success" /> {f}</li>
              ))}
            </ul>
            <p className="mt-6 text-sm text-muted">{t("freeNote")}</p>
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="bg-night noise relative overflow-hidden text-white">
        <div className="bg-brand absolute left-1/2 top-0 size-[30rem] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-40 blur-3xl" />
        <div className="relative mx-auto max-w-3xl px-5 py-24 text-center">
          <h2 className="text-5xl sm:text-6xl">{t("finalTitle")}</h2>
          <p className="mx-auto mt-5 max-w-lg text-white/70">{t("finalText")}</p>
          <Link href={primaryHref} className={buttonVariants({ size: "lg", className: "mt-9" })}>{signedIn ? nav("discover") : t("ctaPrimary")} <ArrowRight /></Link>
        </div>
        <footer className="relative border-t border-white/10">
          <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-8 text-sm text-white/50 sm:flex-row sm:items-center sm:justify-between sm:px-8">
            <Logo light className="text-xl" />
            <nav className="flex gap-6">
              <Link href="/privacy" className="hover:text-white">{t("privacy")}</Link>
              <Link href="/terms" className="hover:text-white">{t("terms")}</Link>
            </nav>
            <p>{t("madeIn")} · © {new Date().getFullYear()}</p>
          </div>
        </footer>
      </section>
    </div>
  );
}
