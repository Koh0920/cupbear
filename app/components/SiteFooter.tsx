import Image from "next/image";
import Link from "next/link";
import { ExternalLink, Github } from "lucide-react";

export default function SiteFooter() {
  return (
    <footer className="border-t border-white/10 bg-[var(--brand-darker)] text-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-10 text-sm md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <Image
            src="/cupbear-logo.jpg"
            alt="CupBear logo"
            width={32}
            height={32}
            className="rounded-full border border-white/10 bg-[var(--brand-deep)] p-1"
          />
          <span className="font-bold">CupBear</span>
          <span className="opacity-60">— a modern cup-bearer</span>
        </div>
        <div className="flex items-center gap-4 text-white/80">
          <Link
            href="https://github.com/cupbear-io"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 transition hover:text-white"
          >
            <Github className="h-4 w-4" />
            <span>View source</span>
            <ExternalLink className="h-3 w-3" />
          </Link>
          <Link href="/disclosure" className="transition hover:text-white">
            Disclosure (Japan Specified Commercial Transactions Act)
          </Link>
          <span className="opacity-50">© 2025 Ato Inc.</span>
        </div>
      </div>
    </footer>
  );
}
