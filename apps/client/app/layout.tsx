import type { Metadata } from "next";
import { Fraunces, Instrument_Sans } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const display = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
  axes: ["opsz"],
});

const body = Instrument_Sans({
  variable: "--font-body",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Mon véhicule — Espace client",
  description: "Suivez l'état de votre véhicule et restez en lien avec votre garage.",
  icons: {
    // Pastille « horizon » aux couleurs du thème — évite le 404 favicon.
    icon:
      "data:image/svg+xml," +
      encodeURIComponent(
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><circle cx="16" cy="16" r="15" fill="#0a0b0e"/><path d="M4 19h24" stroke="#c9a227" stroke-width="2.5" stroke-linecap="round"/><circle cx="16" cy="12" r="4" fill="#c9a227"/></svg>`,
      ),
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr" className={`${display.variable} ${body.variable}`}>
      <body className="font-sans antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
