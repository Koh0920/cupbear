import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "CupBear | File Gate",
  description:
    "CupBear is your file gatekeeper: preview, inspect, and release only safe copies to your team without leaving the browser.",
  metadataBase: new URL("https://cupbear.io"),
  alternates: {
    languages: {
      en: "https://cupbear.io/",
      ja: "https://cupbear.io/ja",
    },
  },
  openGraph: {
    title: "CupBear | The file taste-tester",
    description:
      "Let files land in an isolated room first, check them safely, and hand over clean copies to the business.",
    url: "https://cupbear.io",
    siteName: "CupBear",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "CupBear | The file taste-tester",
    description:
      "CupBear keeps risky files away from endpoints and releases safe copies only.",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-slate-50 text-slate-900 antialiased">{children}</body>
    </html>
  );
}
