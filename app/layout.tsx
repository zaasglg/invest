import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["cyrillic", "latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://in-map-kazakhstan.chatgpt-edu-7368.chatgpt.site"),
  title: "in-map — карта инвестиционных возможностей",
  description:
    "Единая цифровая платформа инвестиционного потенциала Казахстана и Туркестанской области.",
  openGraph: {
    title: "in-map — Туркестанская область",
    description: "Интерактивная карта инвестиционного потенциала региона.",
    images: [{ url: "/og.jpg", width: 1728, height: 912 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "in-map — Туркестанская область",
    description: "Интерактивная карта инвестиционного потенциала региона.",
    images: ["/og.jpg"],
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru">
      <body className={manrope.variable}>{children}</body>
    </html>
  );
}
