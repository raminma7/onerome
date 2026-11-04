import type { Metadata, Viewport } from "next";
import { Outfit } from "next/font/google";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Toaster } from "sonner";
import { ServiceWorkerRegister } from "@/components/sw-register";
import { routing, toLocale } from "@/i18n/routing";
import { publicEnv } from "@/lib/env";
import "../globals.css";

// Outfit: geometric, modern; used for both display and body text.
const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit", display: "swap" });

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: LayoutProps<"/[locale]">): Promise<Metadata> {
  const locale = toLocale((await params).locale);
  const t = await getTranslations({ locale, namespace: "meta" });
  return {
    metadataBase: new URL(publicEnv.siteUrl),
    title: { default: t("title"), template: "%s · OneRome" },
    description: t("description"),
    applicationName: "OneRome",
    manifest: "/manifest.webmanifest",
    appleWebApp: { capable: true, title: "OneRome", statusBarStyle: "default" },
    alternates: { languages: { it: "/it", en: "/en" } },
    icons: { icon: [{ url: "/icons/icon.svg", type: "image/svg+xml" }, { url: "/icons/icon-192.png", sizes: "192x192" }], apple: "/icons/apple-touch-icon.png" },
  };
}

export const viewport: Viewport = {
  themeColor: "#fdf9f6",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function LocaleLayout({ children, params }: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  return (
    <html lang={locale} className={`${outfit.variable} h-full`}>
      <body className="min-h-full">
        <NextIntlClientProvider>
          {children}
          <ServiceWorkerRegister />
          <Toaster position="top-center" toastOptions={{ className: "!rounded-2xl !border-white/60 !bg-white/80 !backdrop-blur-xl !text-ink !shadow-lift" }} />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
