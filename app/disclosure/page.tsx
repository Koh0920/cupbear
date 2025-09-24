import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "特定商取引法に基づく表記 | CupBear",
  description:
    "CupBear（エアロック）の特定商取引法に基づく表記ページです。販売事業者情報や提供条件、サポート窓口についてご確認いただけます。",
};

const cssVars: CSSProperties = {
  "--brand": "#0B1F3B",
  "--accent": "#1DB954",
  "--ink": "#0F172A",
  "--bg": "#F7FAFC",
};

const CONTACT_FORM_URL = "https://cupbear.typeform.com/pilot";
const CONTACT_EMAIL = "hello@cupbear.jp";

const disclosureItems: Array<{ label: string; value: ReactNode; note?: ReactNode }> = [
  { label: "販売事業者", value: "Ato Inc.（株式会社Ato）" },
  { label: "所在地", value: "〒000-0000 東京都〇〇区〇〇 0-0-0（登記住所の記載予定）" },
  { label: "運営統括責任者", value: "準備中（正式リリース時に更新します）" },
  {
    label: "問い合わせ先",
    value: (
      <div className="space-y-1">
        <p>
          フォーム：
          <Link
            href={CONTACT_FORM_URL}
            className="font-semibold text-[var(--brand)] underline decoration-[var(--accent)] decoration-2 underline-offset-2"
            target="_blank"
            rel="noopener noreferrer"
          >
            相談フォーム
          </Link>
        </p>
        <p>
          メール：
          <Link
            href={`mailto:${CONTACT_EMAIL}`}
            className="font-semibold text-[var(--brand)]"
          >
            {CONTACT_EMAIL}
          </Link>
        </p>
      </div>
    ),
  },
  {
    label: "販売価格",
    value: "価格（税抜）はLP記載の各プランをご参照ください。カスタムプランは個別見積となります。",
  },
  {
    label: "商品代金以外の必要料金",
    value: "振込手数料・通信費等はお客様負担となります。",
  },
  {
    label: "代金の支払時期・方法",
    value: "銀行振込（請求書払い）またはクレジットカード決済を予定。正式提供時に契約書記載の条件が優先されます。",
  },
  {
    label: "役務の提供時期",
    value: "契約締結後、管理者アカウントを発行し利用開始となります。PoC/パイロットの場合は個別に開始日を定めます。",
  },
  {
    label: "返品・キャンセル",
    value: "性質上提供開始後の返品・キャンセルはお受けできません。未提供分については契約書に基づき協議します。",
  },
  {
    label: "動作環境",
    value: "最新の Google Chrome / Microsoft Edge（Chromium版）での利用を推奨。詳細条件はリリースノートで案内予定です。",
  },
  {
    label: "その他特記事項",
    value: "上記内容はβ提供段階のため、正式リリース時に変更となる可能性があります。更新があり次第、本ページで告知します。",
  },
];

export default function DisclosurePage() {
  return (
    <div style={cssVars} className="min-h-screen bg-[var(--bg)] text-[var(--ink)]">
      <div className="mx-auto max-w-4xl px-4 py-16">
        <div className="space-y-4">
          <p className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-800">
            <span className="h-2 w-2 rounded-full bg-[var(--accent)]" />
            Compliance Notice
          </p>
          <h1 className="text-3xl font-extrabold text-[var(--brand)]">
            特定商取引法に基づく表記
          </h1>
          <p className="text-sm text-slate-600">
            CupBear（エアロック）に関する特定商取引法（通信販売）第11条に基づく表記です。正式版リリースに向けて随時更新予定です。
          </p>
        </div>
        <div className="mt-10 space-y-4">
          {disclosureItems.map(({ label, value, note }) => (
            <div key={label} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="text-sm font-semibold text-[var(--brand)]">{label}</div>
              <div className="mt-2 text-sm text-slate-700">{value}</div>
              {note ? <div className="mt-2 text-xs text-slate-500">{note}</div> : null}
            </div>
          ))}
        </div>
        <div className="mt-16 flex flex-wrap gap-3">
          <Link
            href="/"
            className="inline-flex items-center rounded-xl border border-slate-300 px-4 py-2 text-sm font-bold hover:border-slate-400"
          >
            トップへ戻る
          </Link>
          <Link
            href={CONTACT_FORM_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center rounded-xl bg-[var(--brand)] px-4 py-2 text-sm font-bold text-white hover:opacity-95"
          >
            導入相談を申し込む
          </Link>
        </div>
      </div>
    </div>
  );
}
