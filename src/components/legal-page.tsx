import { getFormatter, getTranslations } from "next-intl/server";
import { LanguageSwitcher } from "@/components/language-switcher";
import { Logo } from "@/components/logo";
import { Notice } from "@/components/ui/card";
import { Link } from "@/i18n/navigation";
import { LEGAL_UPDATED } from "@/content/legal";

export async function LegalPage({ title, sections }: { title: string; sections: { title: string; body: string[] }[] }) {
  const t = await getTranslations("legal");
  const format = await getFormatter();
  return (
    <div className="bg-travertine-texture min-h-dvh">
      <header className="mx-auto flex max-w-3xl items-center justify-between px-5 py-5">
        <Link href="/"><Logo /></Link>
        <LanguageSwitcher />
      </header>
      <main className="mx-auto max-w-3xl px-5 pb-20">
        <h1 className="text-5xl">{title}</h1>
        <p className="mt-2 text-sm text-muted">{t("updated", { date: format.dateTime(new Date(LEGAL_UPDATED), { dateStyle: "long" }) })}</p>
        <Notice tone="warning" className="mt-6">{t("reviewNotice")}</Notice>
        <div className="mt-10 space-y-8">
          {sections.map((s) => (
            <section key={s.title}>
              <h2 className="text-2xl">{s.title}</h2>
              {s.body.map((p, i) => <p key={i} className="mt-2 leading-relaxed text-ink-soft">{p}</p>)}
            </section>
          ))}
        </div>
      </main>
    </div>
  );
}
