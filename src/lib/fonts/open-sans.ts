import localFont from "next/font/local";

/** Open Sans self-hosted (evita fetch em fonts.googleapis.com no dev/offline). */
export const openSans = localFont({
  src: [
    {
      path: "../../app/fonts/open-sans/open-sans-latin-400-normal.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../../app/fonts/open-sans/open-sans-latin-600-normal.woff2",
      weight: "600",
      style: "normal",
    },
    {
      path: "../../app/fonts/open-sans/open-sans-latin-700-normal.woff2",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-open-sans",
  display: "swap",
});
