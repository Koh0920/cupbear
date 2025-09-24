"use client";

import { useState } from "react";

export type Currency = "JPY" | "USD";

export type PricingPlan = {
  name: string;
  tagline: string;
  price: Record<Currency, string>;
  unit: string;
  bullets: string[];
  cta: {
    label: string;
    href: string;
  };
  featured?: boolean;
  limitNote?: string;
};

export type PricingSectionProps = {
  plans: PricingPlan[];
  trialNote: string;
  complianceNote?: string;
};

export default function PricingSection({ plans, trialNote, complianceNote }: PricingSectionProps) {
  const [currency, setCurrency] = useState<Currency>("JPY");

  return (
    <section id="pricing" className="bg-white">
      <div className="mx-auto max-w-7xl px-4 py-16">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-3xl font-extrabold text-[var(--brand)]">Pricing & rollout</h2>
            <p className="mt-3 text-base text-slate-600">
              Start in the browser, scale with policies and integrations. Switch currency at any time.
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white p-1 text-sm text-slate-600 shadow-sm">
            <button
              type="button"
              onClick={() => setCurrency("JPY")}
              className={`rounded-full px-3 py-1.5 font-semibold transition ${
                currency === "JPY" ? "bg-[var(--brand)] text-white" : "hover:bg-slate-100"
              }`}
              aria-pressed={currency === "JPY"}
            >
              JPY
            </button>
            <button
              type="button"
              onClick={() => setCurrency("USD")}
              className={`rounded-full px-3 py-1.5 font-semibold transition ${
                currency === "USD" ? "bg-[var(--brand)] text-white" : "hover:bg-slate-100"
              }`}
              aria-pressed={currency === "USD"}
            >
              USD
            </button>
          </div>
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {plans.map(({ name, tagline, price, unit, bullets, cta, featured, limitNote }) => (
            <div
              key={name}
              className={`flex h-full flex-col justify-between rounded-3xl border p-6 shadow-sm transition ${
                featured
                  ? "border-[var(--brand)] bg-[var(--brand)]/5 shadow-lg"
                  : "border-slate-200 bg-white hover:border-[var(--brand)]/40"
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <div className="text-lg font-bold text-[var(--brand)]">{name}</div>
                  {featured && (
                    <span className="rounded-full bg-[var(--accent)]/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
                      Most popular
                    </span>
                  )}
                </div>
                <p className="mt-2 text-sm text-slate-600">{tagline}</p>
                <div className="mt-6">
                  <div className="text-3xl font-extrabold text-[var(--brand)]">{price[currency]}</div>
                  <div className="text-xs uppercase tracking-[0.2em] text-slate-500">{unit}</div>
                  {limitNote && <div className="mt-2 text-xs text-slate-500">{limitNote}</div>}
                </div>
                <ul className="mt-6 space-y-3 text-sm text-slate-600">
                  {bullets.map((bullet) => (
                    <li key={bullet} className="flex gap-2">
                      <span className="mt-1 h-2 w-2 rounded-full bg-[var(--accent)]" aria-hidden />
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <a
                href={cta.href}
                className={`mt-8 inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                  featured
                    ? "bg-[var(--brand)] text-white hover:bg-[var(--brand-deep)] focus:ring-[var(--brand)]"
                    : "border border-[var(--brand)] text-[var(--brand)] hover:bg-[var(--brand)] hover:text-white focus:ring-[var(--brand)]"
                }`}
              >
                {cta.label}
              </a>
            </div>
          ))}
        </div>

        <div className="mt-8 rounded-3xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-600">
          <p className="font-semibold text-[var(--brand)]">14-day self-serve trial</p>
          <p className="mt-2 leading-relaxed">
            {trialNote}
          </p>
          {complianceNote && <p className="mt-3 text-xs text-slate-500">{complianceNote}</p>}
        </div>
      </div>
    </section>
  );
}
