import type { ReactNode } from "react";
import { Domine, Open_Sans } from "next/font/google";
import "./globals.css";

const openSans = Open_Sans({
  subsets: ["latin"],
  variable: "--font-open-sans",
});

const domine = Domine({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-domine",
});

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR" className={`${openSans.variable} ${domine.variable}`}>
      <body className="bg-background font-sans text-on-background">{children}</body>
    </html>
  );
}
