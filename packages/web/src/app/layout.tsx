import "./globals.css";
import "@fontsource/poppins/latin-400.css";
import "@fontsource/poppins/latin-500.css";
import "@fontsource/poppins/latin-600.css";
import "@fontsource/poppins/latin-700.css";
import "@fontsource/poppins/latin-800.css";
import type { Metadata } from "next";
import Script from "next/script";
import { getLocale, getDict } from "@/i18n/server";
import { getDictionary } from "@/i18n/dictionaries";
import { I18nProvider } from "@/i18n/I18nProvider";

// Client AdSense YourLauncher. Surchargeable par variable d'environnement,
// mais embarqué par défaut afin que le script soit présent sur toutes les
// pages (exigence de validation AdSense, cf. public/ads.txt).
const ADSENSE_CLIENT =
  process.env.NEXT_PUBLIC_ADSENSE_CLIENT ?? "ca-pub-2402260558916344";

export async function generateMetadata(): Promise<Metadata> {
  const dict = await getDict();
  return {
    title: "YourLauncher — " + dict.hero.titleLine1,
    description: dict.hero.subtitle,
    icons: { icon: "/logo.png", apple: "/logo.png" },
    other: {
      "google-adsense-account": "ca-pub-2402260558916344",
    },
  };
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  const dict = getDictionary(locale);

  return (
    <html lang={locale}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        {ADSENSE_CLIENT && (
          <Script
            async
            strategy="afterInteractive"
            crossOrigin="anonymous"
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`}
          />
        )}
        <I18nProvider locale={locale} dict={dict}>
          {children}
        </I18nProvider>
      </body>
    </html>
  );
}
