import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Archive,
  Building2,
  Calculator,
  Check,
  ClipboardCheck,
  ClipboardList,
  Download,
  FileText,
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
} from "lucide-react";

import {
  CTA_DECK_URL,
  CTA_DEMO_URL,
  CONTACT_EMAIL,
  CONTACT_FORM_URL,
  HERO_DEMO_IMAGE,
} from "../lib/constants";

const cssVars: CSSProperties = {
  "--brand": "#0B1F3B",
  "--brand-deep": "#031737",
  "--brand-darker": "#021027",
  "--accent": "#2ED1B0",
  "--accent-strong": "#1AA88C",
  "--surface": "#0A1F3F",
  "--ink": "#0F172A",
  "--bg": "#F5F7FB",
};

export const metadata: Metadata = {
  title: "CupBear | ファイル通関ゲート",
  description:
    "CupBear（エアロック）は、社外の使い捨てクリーンルームでファイルを開いて検査・無害化し、安全コピーだけを社内に配布する“毒味役”です。",
  alternates: {
    canonical: "https://cupbear.io/ja",
    languages: {
      en: "https://cupbear.io/",
      ja: "https://cupbear.io/ja",
    },
  },
  openGraph: {
    title: "CupBear | 外で開く。安全だけ配る。",
    description:
      "CupBearは外から届いたファイルを隔離ルームで開封・確認し、安全コピーだけを社内へ渡します。",
    locale: "ja_JP",
  },
};

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
    title: "端末に落とす前にストップ",
    desc: "危険なファイルはCupBearが隔離して確認。端末には届きません。",
  },
  {
    icon: Sparkles,
    title: "安全コピーだけ配布",
    desc: "マクロや埋め込みスクリプトを除去し、中身だけを再構成したコピーを渡せます。",
  },
  {
    icon: ClipboardList,
    title: "説明責任の証跡",
    desc: "誰がいつ確認し配布したかを自動ログ化。監査や報告にも使えます。",
  },
];

const reasonsToUse: ValueCard[] = [
  {
    icon: Calculator,
    title: "経理・購買もスムーズ",
    body: "請求書ZIPやPPAPをCupBearに預けて確認。安全PDFだけを社内フォルダへ保存できます。",
  },
  {
    icon: Link2,
    title: "共有リンクも毒味",
    body: "Drive・Boxなどの共有リンクをCupBearで先に開封し、端末に落とさずチェック。",
  },
  {
    icon: Radar,
    title: "公共・規制業界の証跡",
    body: "『安全コピーのみ』『原本を残さない』といったポリシーをUIで強制し、監査ログも自動保存。",
  },
  {
    icon: ServerCog,
    title: "情シス / SOCの可視化",
    body: "誰が何を確認し配布したかをすばやく追跡。事故時の説明責任にも対応できます。",
  },
];

const useCaseCards: ValueCard[] = [
  {
    icon: Calculator,
    title: "経理・購買",
    body: "請求書や発注書をCupBearにドラッグ＆ドロップし、確認後は安全PDFだけを共有。",
  },
  {
    icon: Handshake,
    title: "営業・CS",
    body: "取引先の共有リンクもCupBear経由で開封。営業端末には安全コピーのみ残ります。",
  },
  {
    icon: Building2,
    title: "公共・規制",
    body: "安全コピー化や原本禁止をUIで強制し、証跡をそのまま監査へ提出できます。",
  },
  {
    icon: ServerCog,
    title: "情シス／SOC",
    body: "承認履歴や検査結果が改ざん不可で蓄積。調査にも教育にも使えます。",
  },
  {
    icon: Palette,
    title: "デザイン・製造",
    body: "CADや画像をプレビューし、必要要素だけ再構成した安全ファイルとして渡せます。",
  },
  {
    icon: Usb,
    title: "USB・物理媒体",
    body: "持ち込み媒体もCupBearで毒味し、オフライン経路からの侵入を防ぎます。",
  },
];

const flowSteps: FlowStep[] = [
  {
    step: "1",
    title: "取り込み",
    desc: "ドラッグ＆ドロップ、共有URL、ZIP＋パスワードなど入口を一本化。",
    icon: Download,
  },
  {
    step: "2",
    title: "隔離閲覧",
    desc: "CupBearのリモート画面で中身をチェック。端末には一切落としません。",
    icon: MonitorCheck,
  },
  {
    step: "3",
    title: "安全チェック",
    desc: "ウイルス検査と安全コピー化でマクロや埋め込みを除去。",
    icon: ShieldCheck,
  },
  {
    step: "4",
    title: "配布",
    desc: "承認された安全コピーだけを署名付きURLで配布します。",
    icon: Send,
  },
];

const containmentPoints: DetailPoint[] = [
  {
    icon: Monitor,
    title: "隔離ルームからはピクセルのみ",
    desc: "ファイルはCupBear内で開封され、ユーザーには画面転送だけが届きます。",
    helper: "HTML5ゲートウェイ配信なのでローカルストレージは汚れません。",
  },
  {
    icon: Lock,
    title: "通信は常時暗号化",
    desc: "TLS/NLAなどの暗号トンネルを強制し、盗み見のリスクを遮断します。",
    helper: "全セッションで最新の暗号スイートを必須化。",
  },
  {
    icon: Workflow,
    title: "使い捨て環境で必ず初期化",
    desc: "セッションが終われば環境を破棄し、痕跡は一切残りません。",
    helper: "ワーカーは都度再構築。スナップショットは禁止です。",
  },
];

const cleansingPoints: DetailPoint[] = [
  {
    icon: ClipboardCheck,
    title: "複層のマルウェア検査",
    desc: "ClamAVを基盤に、必要に応じて追加エンジンを重ねられます。",
    helper: "テナントやワークフローごとにスキャン層を追加可能。",
  },
  {
    icon: Sparkles,
    title: "Dangerzone型の安全コピー化",
    desc: "PDF化・画像再構成・メタ情報削除で“使える中身”だけを再生成。",
    helper: "利用者は内容を保ったまま安全ファイルをダウンロード。",
  },
  {
    icon: Archive,
    title: "改ざんできない証跡",
    desc: "承認や配布イベントをハッシュ付きで記録し、WORM相当ストレージで保全します。",
    helper: "後から書き換えられない監査ログが残ります。",
  },
];

const pricingPlans: Array<{
  name: string;
  price: string;
  unit: string;
  bullets: string[];
  cta: string;
  featured?: boolean;
}> = [
  {
    name: "Starter",
    price: "¥700",
    unit: "/席・月",
    bullets: ["通関 50 回/月", "基本的な安全コピー化", "SSO対応"],
    cta: "早割で申し込む",
  },
  {
    name: "Team",
    price: "¥1,400",
    unit: "/席・月",
    bullets: ["通関 200 回/月", "高度な安全コピー化（テンプレート拡張）", "監査レポート/IdP連携"],
    cta: "トライアル開始",
    featured: true,
  },
  {
    name: "Enterprise",
    price: "¥2,200〜",
    unit: "/席・月",
    bullets: ["私設リージョン/オンプレ対応", "SLA保証", "専任サポート"],
    cta: "見積を依頼",
  },
];

export default function Page() {
  return (
    <div style={cssVars} className="min-h-screen bg-[var(--bg)] text-[var(--ink)]">
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
            <Link href="#value" className="transition hover:text-white">
              価値
            </Link>
            <Link href="#flow" className="transition hover:text-white">
              フロー
            </Link>
            <Link href="#pricing" className="transition hover:text-white">
              価格
            </Link>
            <Link href="#faq" className="transition hover:text-white">
              FAQ
            </Link>
            <Link href="#contact" className="transition hover:text-white">
              問い合わせ
            </Link>
            <Link href="/" className="transition hover:text-white">
              English
            </Link>
          </nav>
          <div className="flex items-center gap-2">
            <Link
              href={CTA_DECK_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/15 sm:flex"
            >
              資料DL
            </Link>
            <Link
              href={CTA_DEMO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[var(--brand-darker)] transition hover:bg-[var(--accent-strong)]"
            >
              <ShieldCheck className="h-4 w-4" /> デモを見る
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="bg-gradient-to-b from-[var(--brand-deep)] to-[var(--brand-darker)] text-white">
          <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 pb-20 pt-16 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.3em] text-white/70">
                New
                <span className="rounded-full bg-[var(--accent)] px-2 py-0.5 text-[10px] font-semibold text-[var(--brand-darker)]">ブラウザだけで使える</span>
              </div>
              <h1 className="mt-4 text-4xl font-black leading-tight sm:text-5xl">
                CupBear — ファイルの“毒味役”
              </h1>
              <p className="mt-4 text-lg text-white/80">
                外から届いたファイルをそのまま端末に落とさない。CupBearが隔離ルームで中身を確かめ、安全なコピーだけを社内へ届けます。
              </p>
              <ul className="mt-6 space-y-4 text-sm text-white/80">
                {heroHighlights.map(({ icon: Icon, title, desc }) => (
                  <li key={title} className="flex gap-3">
                    <span className="mt-1 inline-flex h-9 w-9 items-center justify-center rounded-full bg-[var(--accent)]/15 text-[var(--accent)]">
                      <Icon className="h-4 w-4" />
                    </span>
                    <div className="space-y-1">
                      <div className="font-semibold text-white">{title}</div>
                      <p className="text-sm text-white/75">{desc}</p>
                    </div>
                  </li>
                ))}
              </ul>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href={CTA_DEMO_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-full bg-[var(--accent)] px-6 py-3 text-sm font-bold text-[var(--brand-darker)] transition hover:bg-[var(--accent-strong)]"
                >
                  <PlayCircle className="h-4 w-4" /> 90秒デモを見る
                </Link>
                <Link
                  href={CTA_DECK_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-full border border-white/20 px-6 py-3 text-sm font-bold text-white hover:bg-white/10"
                >
                  <FileText className="h-4 w-4" /> 製品シート（PDF）
                </Link>
              </div>
              <p className="mt-5 text-xs text-white/60">
                * ブラウザだけで利用可能。操作ログと配布履歴は改ざんできない保管庫に保存します。
              </p>
            </div>

            <div className="relative flex items-center justify-center">
              <Image
                src={HERO_DEMO_IMAGE}
                alt="CupBear 製品デモ"
                width={960}
                height={640}
                priority
                className="w-full max-w-xl rounded-[28px] border border-white/10 shadow-2xl"
              />
            </div>
          </div>
        </section>

        <section id="value" className="bg-white">
          <div className="mx-auto max-w-7xl px-4 py-16">
            <h2 className="text-3xl font-extrabold text-[var(--brand)]">あなたの業務で使う理由</h2>
            <p className="mt-3 text-base text-slate-600">
              CupBearはただ“すごい技術”ではなく、日々の業務に馴染む毒味役です。よくある業務シーンに当てはめてみました。
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

        <section className="bg-[var(--bg)]">
          <div className="mx-auto max-w-7xl px-4 py-16">
            <h2 className="text-3xl font-extrabold text-[var(--brand)]">あなたの業務での使い方</h2>
            <p className="mt-3 text-base text-slate-600">
              代表的なユースケースをカードにまとめました。自分のチームを思い浮かべながらご覧ください。
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

        <section id="flow" className="bg-white">
          <div className="mx-auto max-w-7xl px-4 py-16">
            <h2 className="text-3xl font-extrabold text-[var(--brand)]">CupBearの“毒味フロー”</h2>
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

        <section className="bg-[var(--bg)]">
          <div className="mx-auto max-w-7xl px-4 py-16">
            <h2 className="text-3xl font-extrabold text-[var(--brand)]">技術の裏付け（詳しい方向け）</h2>
            <p className="mt-3 text-base text-slate-600">
              仕組みはシンプルに伝えつつ、技術者が安心できるよう背景もしっかり公開しています。
            </p>
            <div className="mt-10 grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-white p-6">
                <div className="flex items-center gap-2 font-bold text-[var(--brand)]">
                  <Monitor className="h-4 w-4" /> 安全を守る仕組み
                </div>
                <ul className="mt-4 space-y-4 text-sm text-slate-600">
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
                <div className="flex items-center gap-2 font-bold text-[var(--brand)]">
                  <Sparkles className="h-4 w-4" /> 中身をチェックする仕組み
                </div>
                <ul className="mt-4 space-y-4 text-sm text-slate-600">
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
            <details className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-white/70 p-5 text-sm text-slate-600">
              <summary className="cursor-pointer font-bold text-[var(--brand)]">技術メモを開く（情シス向け）</summary>
              <ul className="mt-3 list-disc space-y-2 pl-5">
                <li>リモートゲートウェイ：Apache Guacamole（RDP/VNC/SSHをHTML5で提供）</li>
                <li>隔離ワーカー：Linux（xrdp/TLS）またはFirecracker microVMで使い捨て起動</li>
                <li>無害化処理：Dangerzoneベースのピクセル再構成、安全PDF化、メタ情報除去</li>
              </ul>
            </details>
          </div>
        </section>

        <section id="pricing" className="bg-white">
          <div className="mx-auto max-w-7xl px-4 py-16">
            <h2 className="text-3xl font-extrabold text-[var(--brand)]">価格（検証用の仮説）</h2>
            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {pricingPlans.map(({ name, price, unit, bullets, cta, featured }) => (
                <div
                  key={name}
                  className={`rounded-2xl border p-6 transition ${
                    featured
                      ? "border-[var(--brand)] bg-[var(--brand)] text-white shadow-lg"
                      : "border-slate-200 bg-slate-50 text-[var(--ink)]"
                  }`}
                >
                  <div className="text-sm font-bold uppercase tracking-wide opacity-80">{name}</div>
                  <div className="mt-2 flex items-end gap-1">
                    <div className="text-3xl font-black">{price}</div>
                    <div className="text-sm opacity-70">{unit}</div>
                  </div>
                  <ul className="mt-4 space-y-2 text-sm opacity-90">
                    {bullets.map((bullet) => (
                      <li key={bullet} className="flex items-start gap-2">
                        <Check className="mt-0.5 h-4 w-4" />
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>
                  <Link
                    href={CONTACT_FORM_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`mt-6 inline-flex w-full items-center justify-center rounded-full px-5 py-2 text-sm font-bold transition ${
                      featured
                        ? "bg-white text-[var(--brand)] hover:bg-white/90"
                        : "border border-slate-300 bg-white text-[var(--brand)] hover:border-[var(--brand)]"
                    }`}
                  >
                    {cta}
                  </Link>
                </div>
              ))}
            </div>
            <p className="mt-4 text-xs text-slate-500">
              表示価格は税抜。最小5席から／月契約（年契約は16%オフ）。通関上限超過時は ¥15/通関（高負荷の安全コピー処理は ×1.5）。価格は検証フェーズにつき予告なく変更される場合があります。
            </p>
          </div>
        </section>

        <section id="faq" className="bg-[var(--bg)]">
          <div className="mx-auto max-w-7xl px-4 py-16">
            <h2 className="text-3xl font-extrabold text-[var(--brand)]">FAQ</h2>
            <div className="mt-8 grid gap-4 md:grid-cols-2">
              {[
                {
                  q: "PPAPに対応できますか？",
                  a: "はい。ZIPとパスワードを入力して隔離環境で解凍・確認し、安全PDF化のうえ配布します。",
                },
                {
                  q: "原本ダウンロードはできますか？",
                  a: "ポリシーで禁止可能です。必要な場合は承認プロセスを通したうえで限定的に許可できます。",
                },
                {
                  q: "クライアントにアプリは必要？",
                  a: "不要です。ブラウザのHTML5ゲートウェイ経由で利用します。",
                },
                {
                  q: "監査ログは保全されますか？",
                  a: "はい。WORM相当ストレージで改ざん防止し、ハッシュ/時刻/操作者/検査結果を保存します。",
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

        <section id="contact" className="bg-white">
          <div className="mx-auto max-w-7xl px-4 py-16">
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-8">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="text-2xl font-extrabold text-[var(--brand)]">2社限定パイロット募集中</div>
                  <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                    経理・CSチームで実環境フィードバックに協力いただける企業様を募集しています。フォームよりご連絡ください。
                  </p>
                </div>
                <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
                  <Link
                    href={CONTACT_FORM_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center rounded-full bg-[var(--brand)] px-6 py-3 text-sm font-bold text-white transition hover:opacity-90"
                  >
                    相談フォームを開く
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
          <div className="flex items-center gap-4">
            <Link href="/disclosure" className="hover:text-white">
              特定商取引法に基づく表記 / Disclosure
            </Link>
            <span className="opacity-50">© 2025 Ato Inc.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
