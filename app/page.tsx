import Image from "next/image";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  Archive,
  Building2,
  Calculator,
  Check,
  ClipboardCheck,
  ClipboardList,
  Download,
  Handshake,
  Link2,
  Lock,
  Monitor,
  MonitorCheck,
  Palette,
  PlayCircle,
  Radar,
  Send,
  ServerCog,
  ShieldCheck,
  Sparkles,
  Usb,
  Workflow,
  CheckCircle,
  Shield,
  Award,
} from "lucide-react";

import { CTA_DEMO_URL, CTA_TRIAL_URL, CONTACT_EMAIL, CONTACT_FORM_URL, HERO_DEMO_IMAGE } from "./lib/constants";
import { brandCssVars } from "./lib/theme";
import PricingSection, { type PricingPlan } from "./components/PricingSection";
import SiteFooter from "./components/SiteFooter";
import SiteNav from "./components/SiteNav";

type Highlight = {
  icon: LucideIcon;
  title: string;
  desc: string;
};

type ValueCard = {
  icon: LucideIcon;
  title: string;
  body: string;
};

type FlowStep = {
  step: string;
  title: string;
  desc: string;
  icon: LucideIcon;
};

type DetailPoint = {
  icon: LucideIcon;
  title: string;
  desc: string;
  helper: string;
};

const heroHighlights: Highlight[] = [
  {
    icon: ShieldCheck,
    title: "Quarantine every upload",
    desc: "Disposable sandboxes detonate untrusted ZIP, office, and media files before endpoints touch them.",
  },
  {
    icon: Sparkles,
    title: "Safe-copy reconstruction",
    desc: "Pixel-perfect PDFs and media exports arrive scrubbed of macros, scripts, and suspicious metadata.",
  },
  {
    icon: ClipboardList,
    title: "Verifiable audit trail",
    desc: "Zero-trust policies, verdicts, and releases are notarised with immutable context-rich logs.",
  },
];

const socialProofStats: Array<{ value: string; label: string }> = [
  { value: "2.8M+", label: "files taste-tested each month" },
  { value: "<1.5s", label: "mean time to verdict" },
  { value: "0", label: "post-release incidents in the last 12 months" },
];

const socialProofLogos = [
  "Leading APAC bank",
  "Global manufacturer",
  "Public sector agency",
  "Regional insurer",
  "Digital-native marketplace",
  "Logistics major",
];

const socialProofTestimonials: Array<{ quote: string; name: string; title: string }> = [
  {
    quote: "We finally have a buffer between supplier uploads and our ERP. Security gets context, finance gets their files.",
    name: "Mizuho S.",
    title: "Director of Security Operations, Financial Services",
  },
  {
    quote: "CupBear lets us enforce ‘safe copy only’ without slowing customer onboarding. Audit loved the immutable logs.",
    name: "Leo A.",
    title: "Head of Risk, SaaS Provider",
  },
];

const complianceBadges = [
  "SOC 2 Type II (FY2024 audit, Security/Availability/Confidentiality)",
  "Independent penetration test (Q1 2025)",
  "Data residency: Tokyo & Frankfurt regions",
  "Signed DPA & Object Lock archive",
];

const reasonsToUse: ValueCard[] = [
  {
    icon: Calculator,
    title: "Finance & procurement stay fast",
    body: "Drag invoice bundles into CupBear, review remotely, and drop the safe PDF straight into shared folders.",
  },
  {
    icon: Link2,
    title: "Shared links get taste-tested",
    body: "Drive, Box, and other shared links open in CupBear so no one downloads surprise payloads.",
  },
  {
    icon: Radar,
    title: "Regulated teams get guardrails",
    body: "Enforce rules like 'safe copy only' or 'no originals stored' with audit-ready logs for regulators.",
  },
  {
    icon: ServerCog,
    title: "IT & SOC gain clarity",
    body: "Find who inspected what, which checks passed, and who approved release in seconds.",
  },
];

const useCaseCards: ValueCard[] = [
  {
    icon: Calculator,
    title: "Finance & procurement",
    body: "Drop invoice bundles into CupBear, review remotely, and export a safe PDF for accounting.",
  },
  {
    icon: Handshake,
    title: "Sales & customer success",
    body: "Open customer share links in CupBear first so reps never pull suspicious files locally.",
  },
  {
    icon: Building2,
    title: "Public sector & regulated",
    body: "Enforce 'safe copy only' policies and hand regulators the evidence they expect.",
  },
  {
    icon: ServerCog,
    title: "IT / SOC",
    body: "Trace every inspection, verdict, and release with immutable logs for incident reviews.",
  },
  {
    icon: Palette,
    title: "Design & manufacturing",
    body: "Preview CAD or imagery, then distribute reconstructed assets without risky extras.",
  },
  {
    icon: Usb,
    title: "USB & physical media",
    body: "Run drop-in media through CupBear before it touches your network.",
  },
];

const flowSteps: FlowStep[] = [
  {
    step: "1",
    title: "Ingest",
    desc: "Drag & drop files, paste a link, or upload ZIP + password — CupBear catches every entry path.",
    icon: Download,
  },
  {
    step: "2",
    title: "Isolated review",
    desc: "Open the file inside CupBear's remote room and inspect it without touching endpoints.",
    icon: MonitorCheck,
  },
  {
    step: "3",
    title: "Safety checks",
    desc: "Run antivirus and safe-copy reconstruction to strip macros, scripts, and metadata.",
    icon: ShieldCheck,
  },
  {
    step: "4",
    title: "Release",
    desc: "Approve and deliver the safe copy via a signed download link.",
    icon: Send,
  },
];

const containmentPoints: DetailPoint[] = [
  {
    icon: Monitor,
    title: "Pixels only leave the room",
    desc: "Files open inside CupBear and only the streamed screen reaches the user.",
    helper: "HTML5 gateway delivery keeps local storage untouched.",
  },
  {
    icon: Lock,
    title: "Encrypted end to end",
    desc: "Every session rides on enforced TLS/NLA tunnels to keep prying eyes out.",
    helper: "Modern ciphers are mandatory for every connection.",
  },
  {
    icon: Workflow,
    title: "Disposable environments",
    desc: "Sessions end with a clean teardown so artefacts never linger.",
    helper: "Workers are rebuilt each time — snapshots stay disabled.",
  },
];

const cleansingPoints: DetailPoint[] = [
  {
    icon: ClipboardCheck,
    title: "Layered malware detection",
    desc: "Baseline ClamAV scanning with room for additional engines when needed.",
    helper: "Stack engines per tenant or workflow for layered defence.",
  },
  {
    icon: Sparkles,
    title: "Safe-copy reconstruction",
    desc: "Rebuild documents à la Dangerzone — safe PDFs, rebuilt images, metadata stripped.",
    helper: "Keeps what teams need, removes what attackers rely on.",
  },
  {
    icon: Archive,
    title: "Immutable audit archive",
    desc: "Every approval and download is notarised with hashes, operators, and timestamps.",
    helper: "Stored in WORM-grade storage so nobody can rewrite history.",
  },
];

const pricingPlans: PricingPlan[] = [
  {
    name: "Starter",
    tagline: "Self-serve sandbox for security and ops pilots",
    price: { JPY: "¥980", USD: "$12" },
    unit: "per user / month (annual)",
    bullets: [
      "Up to 10,000 scans monthly",
      "Safe-copy templates for PDF, Office, and media",
      "Workspace audit trail & email alerts",
    ],
    cta: { label: "Start free trial", href: CTA_TRIAL_URL },
    limitNote: "Includes 14-day sandbox with sample datasets",
  },
  {
    name: "Team",
    tagline: "Zero-trust file gateway with policy automation",
    price: { JPY: "¥1,980", USD: "$24" },
    unit: "per user / month (annual)",
    bullets: [
      "Unlimited scans & safe-copy policies",
      "SAML / SCIM, IP allowlists, granular approvals",
      "SIEM export & 1-year immutable retention",
    ],
    cta: { label: "Book rollout session", href: CONTACT_FORM_URL },
    featured: true,
  },
  {
    name: "Enterprise",
    tagline: "Private regions, custom integrations, 24×7 support",
    price: { JPY: "Custom", USD: "Custom" },
    unit: "per deployment",
    bullets: [
      "Dedicated regions (Tokyo, Frankfurt, or private cloud)",
      "API orchestration, approvals, and DLP hand-off",
      "99.95% SLA, named TAM, quarterly pen tests",
    ],
    cta: { label: "Talk to security team", href: CONTACT_FORM_URL },
  },
];

export default function Page() {
  return (
    <div style={brandCssVars} className="min-h-screen bg-[var(--bg)] text-[var(--ink)]">
      <SiteNav currentPath="/" />

      <main>
        <section className="bg-gradient-to-b from-[var(--brand-deep)] to-[var(--brand-darker)] text-white">
          <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 pb-12 pt-16 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:gap-16">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.3em] text-white/70">
                Zero trust ready
                <span className="rounded-full bg-[var(--accent)] px-2 py-0.5 text-[10px] font-semibold text-[var(--brand-darker)]">Safe copy</span>
              </div>
              <h1 className="mt-4 text-4xl font-black leading-tight sm:text-5xl">
                Quarantine unknown files. Release only safe deliverables.
              </h1>
              <p className="mt-4 max-w-2xl text-lg text-white/80">
                CupBear isolates every upload in a disposable sandbox, detonates risky content, rebuilds clean PDFs or media, and notarises each release with immutable logs.
              </p>
              <ul className="mt-6 space-y-4 text-sm text-white/80">
                {heroHighlights.map(({ icon: Icon, title, desc }) => (
                  <li key={title} className="flex gap-3">
                    <span className="mt-1 inline-flex h-9 w-9 items-center justify-center rounded-full bg-[var(--accent)]/20 text-[var(--accent)]">
                      <Icon className="h-4 w-4" />
                    </span>
                    <div className="space-y-1">
                      <div className="font-semibold text-white">{title}</div>
                      <p className="text-sm text-white/75">{desc}</p>
                    </div>
                  </li>
                ))}
              </ul>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link
                  href={CTA_TRIAL_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-full bg-[var(--accent)] px-6 py-3 text-sm font-bold text-[var(--brand-darker)] transition hover:bg-[var(--accent-strong)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[var(--brand-darker)] focus:ring-[var(--accent)]"
                >
                  <ShieldCheck className="h-4 w-4" /> Start free trial
                </Link>
                <Link
                  href="/demo"
                  className="inline-flex items-center gap-2 rounded-full bg-white/10 px-6 py-3 text-sm font-bold text-white transition hover:bg-white/15 focus:outline-none focus:ring-2 focus:ring-white/60"
                >
                  <Monitor className="h-4 w-4" /> Try interactive demo
                </Link>
                <Link
                  href={CTA_DEMO_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-full border border-white/30 px-6 py-3 text-sm font-bold text-white transition hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/60"
                >
                  <PlayCircle className="h-4 w-4" /> Watch 90s demo
                </Link>
                <Link
                  href={CONTACT_FORM_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-semibold text-white/80 underline-offset-4 hover:text-white hover:underline focus:outline-none focus:ring-2 focus:ring-white/60"
                >
                  Talk to security team
                </Link>
              </div>
              <p className="mt-5 text-xs text-white/60">
                Built for SOC, CSIRT, and procurement teams that need zero-trust screening, safe-copy delivery, and auditable releases before files touch production systems.
              </p>
            </div>

            <div className="relative order-first flex items-center justify-center lg:order-last">
              <Image
                src={HERO_DEMO_IMAGE}
                alt="CupBear product demo UI"
                width={960}
                height={640}
                priority
                className="w-full max-w-xl rounded-[28px] border border-white/10 shadow-2xl lg:max-w-none"
              />
            </div>
          </div>

          <div id="trust" className="mx-auto max-w-6xl px-4 pb-12">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur">
              <div className="grid gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
                <div className="space-y-6">
                  <div className="grid gap-4 sm:grid-cols-3">
                    {socialProofStats.map(({ value, label }) => (
                      <div key={label} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                        <div className="text-2xl font-extrabold text-white">{value}</div>
                        <p className="mt-1 text-[12px] uppercase tracking-[0.2em] text-white/60">{label}</p>
                      </div>
                    ))}
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.3em] text-white/60">
                    {socialProofLogos.map((label) => (
                      <span key={label} className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-white/80">
                        {label}
                      </span>
                    ))}
                  </div>
                  <ul className="grid gap-3 text-xs text-white/70 md:grid-cols-2">
                    {complianceBadges.map((badge) => (
                      <li key={badge} className="flex gap-2">
                        <Check className="mt-0.5 h-4 w-4 text-[var(--accent)]" />
                        <span>{badge}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="space-y-4 rounded-2xl border border-white/10 bg-black/30 p-5">
                  <h3 className="text-sm font-semibold text-white/70">Voices from pilots</h3>
                  <div className="space-y-4 text-sm text-white/80">
                    {socialProofTestimonials.map(({ quote, name, title }) => (
                      <figure key={name} className="space-y-2 border-b border-white/10 pb-3 last:border-0 last:pb-0">
                        <blockquote className="text-white">“{quote}”</blockquote>
                        <figcaption className="text-xs text-white/60">
                          {name} — {title}
                        </figcaption>
                      </figure>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mx-auto max-w-5xl px-4 pb-20">
            <div className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-white/5 p-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-white">Hands-on sandbox demo</h3>
                <p className="text-sm text-white/70">
                  Launch the local taste-test experience on its own page and explore the safe-copy workflow without leaving your browser.
                </p>
                <p className="text-xs text-white/50">
                  Files stay inside the sandboxed widget. For the full remote isolation flow, request access to the invite-only cloud demo below.
                </p>
              </div>
              <Link
                href="/demo"
                className="inline-flex items-center gap-2 self-start rounded-full bg-[var(--accent)] px-6 py-3 text-sm font-bold text-[var(--brand-darker)] transition hover:bg-[var(--accent-strong)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[var(--brand-darker)] focus:ring-[var(--accent)]"
              >
                <Monitor className="h-4 w-4" /> Try interactive demo
              </Link>
            </div>
          </div>
        </section>

        {/* Transition gradient between dark and light sections */}
        <div className="h-24 bg-gradient-to-b from-[var(--brand-darker)] via-[var(--brand-darker)]/60 to-white"></div>

        <section id="value" className="bg-white">
          <div className="mx-auto max-w-7xl px-4 py-16">
            <h2 className="text-3xl font-extrabold text-[var(--brand)]">Why teams rely on CupBear</h2>
            <p className="mt-3 text-base text-slate-600">
              CupBear isn&rsquo;t just shiny security tech — it slides into everyday workflows as the dependable taste-tester for files.
            </p>
            <div className="mt-10 grid gap-4 md:grid-cols-2">
              {reasonsToUse.map(({ icon: Icon, title, body }) => (
                <div key={title} className="flex gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-6">
                  <span className="mt-1 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-[var(--brand)] shadow-sm">
                    <Icon className="h-6 w-6" />
                  </span>
                  <div>
                    <div className="text-base font-bold text-[var(--brand)]">{title}</div>
                    <p className="mt-1 text-sm text-slate-600 leading-relaxed">{body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Subtle transition between white and light gray sections */}
        <div className="h-8 bg-gradient-to-b from-white to-[var(--bg)]"></div>

        <section className="bg-[var(--bg)]">
          <div className="mx-auto max-w-7xl px-4 py-16">
            <h2 className="text-3xl font-extrabold text-[var(--brand)]">How it plays out day-to-day</h2>
            <p className="mt-3 text-base text-slate-600">
              Picture these cards in your own teams and you&rsquo;ll see where CupBear slots itself in.
            </p>
            <div className="mt-10 grid gap-4 md:grid-cols-3">
              {useCaseCards.map(({ icon: Icon, title, body }) => (
                <div key={title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center gap-3 text-[var(--brand)]">
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[var(--brand)]/10">
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="text-base font-semibold">{title}</span>
                  </div>
                  <p className="mt-3 text-sm text-slate-600 leading-relaxed">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Subtle transition between light gray and white sections */}
        <div className="h-8 bg-gradient-to-b from-[var(--bg)] to-white"></div>

        <section id="flow" className="bg-white">
          <div className="mx-auto max-w-7xl px-4 py-16">
            <h2 className="text-3xl font-extrabold text-[var(--brand)]">The CupBear taste-test flow</h2>
            <div className="mt-8 grid gap-4 md:grid-cols-4">
              {flowSteps.map(({ step, title, desc, icon: Icon }) => (
                <div key={step} className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                  <div className="flex items-center gap-2 text-[var(--brand)]">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--brand)] text-xs font-bold text-white">
                      {step}
                    </span>
                    <span className="text-sm font-semibold">{title}</span>
                  </div>
                  <p className="mt-3 flex items-start gap-2 text-sm text-slate-600 leading-relaxed">
                    <Icon className="mt-1 h-4 w-4 text-[var(--brand)]" /> {desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Subtle transition between white and light gray sections */}
        <div className="h-8 bg-gradient-to-b from-white to-[var(--bg)]"></div>

        <section id="security" className="bg-[var(--bg)]">
          <div className="mx-auto max-w-7xl px-4 py-16">
            <div className="flex items-center gap-3 mb-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--brand)]/10 text-[var(--brand)]">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-3xl font-extrabold text-[var(--brand)]">Security & Technical Architecture</h2>
                <p className="mt-3 text-base text-slate-600">
                  Enterprise-grade security controls designed for regulated environments and high-risk workflows.
                </p>
              </div>
            </div>

            <div className="mt-10 grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-white p-6">
                <div className="flex items-center gap-2 font-bold text-[var(--brand)] mb-4">
                  <ShieldCheck className="h-5 w-5" />
                  <span>Zero-Trust Containment</span>
                </div>
                <ul className="space-y-4 text-sm text-slate-600">
                  {containmentPoints.map(({ icon: Icon, title, desc, helper }) => (
                    <li key={title} className="flex gap-3">
                      <span className="mt-1 inline-flex h-9 w-9 items-center justify-center rounded-full bg-[var(--brand)]/10 text-[var(--brand)]">
                        <Icon className="h-4 w-4" />
                      </span>
                      <div>
                        <div className="font-semibold text-[var(--brand)]">{title}</div>
                        <p className="mt-1 leading-relaxed">{desc}</p>
                        <p className="text-xs text-slate-500">{helper}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-6">
                <div className="flex items-center gap-2 font-bold text-[var(--brand)] mb-4">
                  <Sparkles className="h-5 w-5" />
                  <span>Content Disarmament & Reconstruction</span>
                </div>
                <ul className="space-y-4 text-sm text-slate-600">
                  {cleansingPoints.map(({ icon: Icon, title, desc, helper }) => (
                    <li key={title} className="flex gap-3">
                      <span className="mt-1 inline-flex h-9 w-9 items-center justify-center rounded-full bg-[var(--brand)]/10 text-[var(--brand)]">
                        <Icon className="h-4 w-4" />
                      </span>
                      <div>
                        <div className="font-semibold text-[var(--brand)]">{title}</div>
                        <p className="mt-1 leading-relaxed">{desc}</p>
                        <p className="text-xs text-slate-500">{helper}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Security Compliance & Certifications */}
            <div className="mt-8 rounded-2xl border border-[var(--brand)]/20 bg-[var(--brand)]/5 p-6">
              <div className="flex items-center gap-2 font-bold text-[var(--brand)] mb-4">
                <Award className="h-5 w-5" />
                <span>Security Standards & Compliance</span>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--brand)]/10 text-[var(--brand)] mx-auto mb-2">
                    <Shield className="h-6 w-6" />
                  </div>
                  <h4 className="font-semibold text-[var(--brand)] text-sm">SOC 2 Type II</h4>
                  <p className="text-xs text-slate-600 mt-1">Annual security audits and controls validation</p>
                </div>
                <div className="text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--brand)]/10 text-[var(--brand)] mx-auto mb-2">
                    <Lock className="h-6 w-6" />
                  </div>
                  <h4 className="font-semibold text-[var(--brand)] text-sm">ISO 27001</h4>
                  <p className="text-xs text-slate-600 mt-1">Information security management certified</p>
                </div>
                <div className="text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--brand)]/10 text-[var(--brand)] mx-auto mb-2">
                    <CheckCircle className="h-6 w-6" />
                  </div>
                  <h4 className="font-semibold text-[var(--brand)] text-sm">GDPR Compliant</h4>
                  <p className="text-xs text-slate-600 mt-1">Privacy by design with data minimization</p>
                </div>
              </div>
            </div>

            <details className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-white/70 p-5 text-sm text-slate-600">
              <summary className="cursor-pointer font-bold text-[var(--brand)] flex items-center gap-2">
                <Monitor className="h-4 w-4" />
                <span>Technical Implementation Details (for IT teams)</span>
              </summary>
              <div className="mt-4 space-y-3">
                <div>
                  <h4 className="font-semibold text-[var(--brand)] mb-2">Remote Gateway Architecture</h4>
                  <ul className="list-disc space-y-1 pl-5">
                    <li>Apache Guacamole serving RDP/VNC/SSH over HTML5 with WebSocket transport</li>
                    <li>Zero client-side software installation required</li>
                    <li>Session recording and replay capabilities for audit compliance</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-[var(--brand)] mb-2">Isolated Worker Environment</h4>
                  <ul className="list-disc space-y-1 pl-5">
                    <li>Ephemeral Linux instances with xrdp/TLS or Firecracker microVMs</li>
                    <li>No persistent storage, full teardown after each session</li>
                    <li>Network isolation with egress filtering and DNS monitoring</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-[var(--brand)] mb-2">Content Disarmament Process</h4>
                  <ul className="list-disc space-y-1 pl-5">
                    <li>Dangerzone-style pixel reconstruction for PDFs and images</li>
                    <li>Safe PDF generation with content preservation and metadata scrubbing</li>
                    <li>Multi-engine malware scanning with ClamAV, YARA rules, and custom detectors</li>
                  </ul>
                </div>
              </div>
            </details>
          </div>
        </section>

        {/* Subtle transition between light gray and white sections */}
        <div className="h-8 bg-gradient-to-b from-[var(--bg)] to-white"></div>

        <PricingSection
          plans={pricingPlans}
          trialNote="Self-serve tenants get 10,000 scans, browser-only demo data, and policy templates. Upload your own files or use provided samples — everything stays in your browser unless you opt into cloud isolation."
          complianceNote="Prices exclude tax. Annual and multi-year terms available. Private regions and regulated deployments include procurement pack, security questionnaire support, and 99.95% SLA options."
        />

        {/* Subtle transition between white and light gray sections */}
        <div className="h-8 bg-gradient-to-b from-white to-[var(--bg)]"></div>

        <section id="faq" className="bg-[var(--bg)]">
          <div className="mx-auto max-w-7xl px-4 py-16">
            <h2 className="text-3xl font-extrabold text-[var(--brand)]">FAQ</h2>
            <div className="mt-8 grid gap-4 md:grid-cols-2">
              {[
                {
                  q: "Do you handle PPAP bundles?",
                  a: "Yes. Upload the ZIP, provide the password, review inside CupBear, and distribute the safe PDF copy.",
                },
                {
                  q: "Can users download the original file?",
                  a: "You can block originals entirely or allow exceptions through an approval workflow.",
                },
                {
                  q: "Do end users need an app?",
                  a: "No. CupBear runs entirely in the browser through an HTML5 gateway.",
                },
                {
                  q: "How are audit logs preserved?",
                  a: "We store hashes, timestamps, operators, and verdicts in WORM-grade storage to prevent tampering.",
                },
                {
                  q: "What security certifications do you have?",
                  a: "SOC 2 Type II certified with ISO 27001 and GDPR compliance. Full penetration testing reports available under NDA.",
                },
                {
                  q: "Is the source code available for review?",
                  a: "Core security components are open source. Enterprise customers can access full source code under escrow agreements.",
                },
              ].map(({ q, a }) => (
                <details key={q} className="rounded-2xl border border-slate-200 bg-white p-5">
                  <summary className="cursor-pointer font-bold text-[var(--brand)]">{q}</summary>
                  <p className="mt-2 text-sm text-slate-600 leading-relaxed">{a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* Subtle transition between light gray and white sections */}
        <div className="h-8 bg-gradient-to-b from-[var(--bg)] to-white"></div>

        <section id="contact" className="bg-white">
          <div className="mx-auto max-w-7xl px-4 py-16">
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-8">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="text-2xl font-extrabold text-[var(--brand)]">Pilot program: 2 slots left</div>
                  <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                    We&rsquo;re onboarding finance or CS teams willing to run CupBear in real workflows and share feedback. Drop us a line.
                  </p>
                </div>
                <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
                  <Link
                    href={CONTACT_FORM_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center rounded-full bg-[var(--brand)] px-6 py-3 text-sm font-bold text-white transition hover:opacity-90"
                  >
                    Open the consultation form
                  </Link>
                  <Link
                    href={`mailto:${CONTACT_EMAIL}`}
                    className="inline-flex items-center justify-center rounded-full border border-slate-300 px-6 py-3 text-sm font-bold text-[var(--brand)] hover:border-[var(--brand)]"
                  >
                    {CONTACT_EMAIL}
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
