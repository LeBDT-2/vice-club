import type { Metadata, Viewport } from "next";
import { Archivo } from "next/font/google";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import "./globals.css";

const archivo = Archivo({
  subsets: ["latin"],
  variable: "--font-archivo",
  axes: ["wdth"],
  style: ["normal", "italic"],
  display: "swap",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "VICE CLUB — Trouve ton équipe, crée ton garage, défie tes amis",
    template: "%s — VICE CLUB",
  },
  description:
    "Communauté francophone et gratuite autour de GTA : trouve des partenaires de jeu compatibles, compose ton garage virtuel et joue à cinq mini-jeux et au défi du jour.",
  applicationName: "VICE CLUB",
  openGraph: {
    type: "website",
    locale: "fr_FR",
    siteName: "VICE CLUB",
  },
  twitter: { card: "summary_large_image" },
  // Préversions et environnements locaux jamais indexés.
  ...(process.env.APP_ENV === "production" ? {} : { robots: { index: false, follow: false } }),
};

export const viewport: Viewport = {
  themeColor: "#0a0f1f",
  colorScheme: "dark",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr" className={archivo.variable}>
      <body className="flex min-h-dvh flex-col antialiased">
        <Header />
        <main id="contenu" className="flex-1">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
