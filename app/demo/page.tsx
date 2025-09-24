import Link from "next/link";
import type { Metadata } from "next";

import LinkPreviewSandbox from "../components/LinkPreviewSandbox";
import SiteFooter from "../components/SiteFooter";
import SiteNav from "../components/SiteNav";
import { brandCssVars } from "../lib/theme";

export const metadata: Metadata = {
  title: "Interactive Demo | CupBear",
  description:
    "Try CupBear's local sandbox to experience safe-copy reconstruction and verdicting in your browser.",
};

export default function DemoPage() {
  return (
    <div
      style={brandCssVars}
      className="flex min-h-screen flex-col bg-white text-[var(--ink)]"
    >
      <SiteNav currentPath="/demo" />
      <main className="flex flex-1 items-center justify-center px-4 pb-12 pt-12">
        <div className="w-full max-w-2xl text-center">
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[var(--brand)] sm:text-4xl">
            Keep your laptop
            <span className="mx-2 inline-block align-baseline bg-gradient-to-b from-sky-200 via-sky-400 to-white bg-clip-text text-transparent font-semibold">
              clean
            </span>
            anytime.
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Preview every file from a separate CupBear sandbox before it touches your device.
          </p>

          <div className="mt-8">
            <LinkPreviewSandbox />
          </div>

          <div className="mt-6 text-xs text-slate-500">
            Paste a link to see the remote view instantly. No downloads, no local risk.
          </div>

          <div className="mt-8 text-sm text-slate-400">
            <Link href="/" className="underline-offset-4 hover:underline">
              Back to product site
            </Link>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
