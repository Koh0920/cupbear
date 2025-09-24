import Image from "next/image";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";

import { CTA_DECK_URL, CTA_TRIAL_URL } from "../lib/constants";

type SiteNavProps = {
  currentPath: string;
};

type NavItem = {
  label: string;
  href: string;
  anchor?: boolean;
};

const navItems: NavItem[] = [
  { label: "Trust", href: "#trust", anchor: true },
  { label: "Value", href: "#value", anchor: true },
  { label: "Flow", href: "#flow", anchor: true },
  { label: "Security", href: "#security", anchor: true },
  { label: "Pricing", href: "#pricing", anchor: true },
  { label: "FAQ", href: "#faq", anchor: true },
  { label: "Contact", href: "#contact", anchor: true },
  { label: "Demo", href: "/demo" },
  { label: "日本語", href: "/ja" },
];

function resolveHref(item: NavItem, currentPath: string) {
  if (!item.anchor) {
    return item.href;
  }
  return currentPath === "/" ? item.href : `/${item.href}`;
}

function isActive(item: NavItem, currentPath: string) {
  if (item.href === "/demo") {
    return currentPath.startsWith("/demo");
  }
  if (item.href === "/ja") {
    return currentPath.startsWith("/ja");
  }
  return false;
}

export default function SiteNav({ currentPath }: SiteNavProps) {
  return (
    <header className="sticky top-0 z-20 border-b border-white/10 bg-[var(--brand-darker)]">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 text-white">
        <Link href="/" className="flex items-center gap-3">
          <Image
            src="/cupbear-logo.jpg"
            alt="CupBear logo"
            width={40}
            height={40}
            className="rounded-full border border-white/20 bg-[var(--brand-darker)] object-contain p-1"
            priority
          />
          <div>
            <div className="text-xl font-black tracking-tight">CupBear</div>
            <div className="text-[11px] uppercase tracking-[0.3em] text-white/60">FILE GATE</div>
          </div>
        </Link>
        <nav className="hidden items-center gap-6 text-sm font-medium text-white/80 md:flex">
          {navItems.map((item) => {
            const href = resolveHref(item, currentPath);
            const active = isActive(item, currentPath);

            return (
              <Link
                key={item.label}
                href={href}
                className={`transition hover:text-white ${active ? "text-white" : ""}`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="flex items-center gap-2">
          <Link
            href={CTA_DECK_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/15 sm:flex"
          >
            Download Deck
          </Link>
          <Link
            href={CTA_TRIAL_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[var(--brand-darker)] transition hover:bg-[var(--accent-strong)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[var(--brand-darker)] focus:ring-[var(--accent)]"
          >
            <ShieldCheck className="h-4 w-4" /> Start free trial
          </Link>
        </div>
      </div>
    </header>
  );
}
