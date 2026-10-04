import type { ReactNode } from "react";
import { Open_Sans } from "next/font/google";
import "./globals.css";

const openSans = Open_Sans({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-open-sans",
});

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR" className={openSans.variable}>
      <body className="bg-background font-sans text-on-background">{children}</body>
    </html>
  );
}
