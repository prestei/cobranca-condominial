import type { AppProps } from "next/app";
import { Providers } from "@/app/providers";
import { openSans } from "@/lib/fonts/open-sans";
import "@/app/globals.css";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <div className={`${openSans.variable} min-h-screen bg-background font-sans text-on-background`}>
      <Providers>
        <Component {...pageProps} />
      </Providers>
    </div>
  );
}
