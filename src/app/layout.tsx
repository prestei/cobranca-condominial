import type { ReactNode } from "react";
import { Providers } from "@/app/providers";
import { openSans } from "@/lib/fonts/open-sans";
import "./globals.css";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR" className={openSans.variable} suppressHydrationWarning>
      <body
        className="bg-background font-sans text-on-background"
        suppressHydrationWarning
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
