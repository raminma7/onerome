import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Inter } from "next/font/google";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Toaster } from "sonner";
import { routing, toLocale } from "@/i18n/routing";
import { publicEnv } from "@/lib/env";
import "../globals.css";

const serif = Cormorant_Garamond({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-cormorant", display: "swap" });
const sans = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

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
    icons: { icon: "/icons/icon.svg", apple: "/icons/apple-touch-icon.png" },
  };
}

export const viewport: Viewport = {
  themeColor: "#fbf8f3",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function LocaleLayout({ children, params }: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  return (
    <html lang={locale} className={`${serif.variable} ${sans.variable} h-full`}>
      <body className="min-h-full">
        <NextIntlClientProvider>
          {children}
          <Toaster position="top-center" toastOptions={{ className: "!rounded-2xl !border-line !bg-ivory !text-ink" }} />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
