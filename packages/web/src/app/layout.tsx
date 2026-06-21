import "./globals.css";
import type { Metadata } from "next";
import { getLocale, getDict } from "@/i18n/server";
import { getDictionary } from "@/i18n/dictionaries";
import { I18nProvider } from "@/i18n/I18nProvider";

export async function generateMetadata(): Promise<Metadata> {
  const dict = await getDict();
  return {
    title: "YourLauncher — " + dict.hero.titleLine1,
    description: dict.hero.subtitle,
    icons: { icon: "/logo.png", apple: "/logo.png" },
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const dict = getDictionary(locale);

  return (
    <html lang={locale}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <I18nProvider locale={locale} dict={dict}>
          {children}
        </I18nProvider>
      </body>
    </html>
  );
}
