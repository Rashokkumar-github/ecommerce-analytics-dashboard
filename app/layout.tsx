import type { Metadata } from "next";
import { DM_Serif_Display, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const dmSerif = DM_Serif_Display({
  weight: ["400"],
  subsets: ["latin"],
  variable: "--font-dm-serif",
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
});

export const metadata: Metadata = {
  title: "GA4 E-Commerce Dashboard",
  description:
    "Interactive analytics dashboard — GA4 obfuscated e-commerce dataset (Nov 2020 – Jan 2021)",
  openGraph: {
    title: "GA4 E-Commerce Dashboard",
    description: "Revenue, traffic, conversion & product performance — Nov 2020 – Jan 2021",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${dmSerif.variable} ${jetbrains.variable}`}>
      <body className="antialiased bg-[#0D0D0D] text-[#F5F0E8]">
        {children}
      </body>
    </html>
  );
}
