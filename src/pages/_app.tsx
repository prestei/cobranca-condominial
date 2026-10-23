import type { AppProps } from "next/app";
import { Open_Sans } from "next/font/google";
import { Providers } from "@/app/providers";
import "@/app/globals.css";

const openSans = Open_Sans({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-open-sans",
});

export default function App({ Component, pageProps }: AppProps) {
  return (
    <div className={`${openSans.variable} min-h-screen bg-background font-sans text-on-background`}>
      <Providers>
        <Component {...pageProps} />
      </Providers>
    </div>
  );
}
