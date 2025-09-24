"use client";

import { useCallback, useState, type FormEvent } from "react";

function sanitizeUrl(candidate: string): string {
  const trimmed = candidate.trim();
  if (!trimmed) {
    throw new Error("Please paste a link.");
  }

  let url: URL;
  try {
    url = new URL(trimmed, typeof window !== "undefined" ? window.location.origin : "http://localhost");
  } catch {
    throw new Error("That URL looks invalid.");
  }

  if (!/^https?:$/.test(url.protocol)) {
    throw new Error("Use an http or https link.");
  }

  return url.href;
}

export default function LinkPreviewSandbox() {
  const [rawInput, setRawInput] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setError(null);

      try {
        const safeUrl = sanitizeUrl(rawInput);
        setPreviewUrl(safeUrl);
        setIsLoading(true);
      } catch (err) {
        setPreviewUrl(null);
        setIsLoading(false);
        setError((err as Error).message);
      }
    },
    [rawInput],
  );

  const resetPreview = useCallback(() => {
    setPreviewUrl(null);
    setIsLoading(false);
  }, []);

  return (
    <div className="w-full">
      <form onSubmit={handleSubmit} className="flex flex-col gap-2">
        <label
          className="flex items-center justify-between text-xs text-slate-500"
          htmlFor="demo-link-input"
        >
          <span className="text-sm font-medium text-slate-600">File link</span>
          <span className="text-xs">Example: https://example.com/invoice.pdf</span>
        </label>
        <div className="flex w-full gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 shadow-sm focus-within:border-[var(--accent)]">
          <input
            id="demo-link-input"
            type="url"
            inputMode="url"
            autoCapitalize="none"
            spellCheck={false}
            placeholder="https://..."
            value={rawInput}
            onChange={(event) => {
              setRawInput(event.target.value);
              setError(null);
            }}
            className="flex-1 bg-transparent text-base text-[var(--brand)] outline-none placeholder:text-slate-300"
          />
          {previewUrl && (
            <button
              type="button"
              onClick={resetPreview}
              className="text-sm font-medium text-slate-400 transition hover:text-slate-600"
            >
              Clear
            </button>
          )}
          <button
            type="submit"
            className="rounded-full bg-[var(--brand)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--brand-deep)]"
          >
            Preview
          </button>
        </div>
        {error && <p className="text-xs text-red-500">{error}</p>}
      </form>

      <div className="mt-6 min-h-[260px] w-full overflow-hidden rounded-3xl border border-slate-200 bg-slate-50">
        {previewUrl ? (
          <iframe
            key={previewUrl}
            src={previewUrl}
            title="Sandbox preview"
            sandbox="allow-forms allow-scripts"
            referrerPolicy="no-referrer"
            className="h-[300px] w-full border-0 bg-white"
            onLoad={() => setIsLoading(false)}
          />
        ) : (
          <div className="flex h-full min-h-[260px] items-center justify-center text-sm text-slate-400">
            Your remote sandbox will appear here.
          </div>
        )}
      </div>

      {isLoading && (
        <p className="mt-3 text-right text-xs text-slate-400">Loading…</p>
      )}
    </div>
  );
}
