"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import DOMPurify from "dompurify";
import { ShieldCheck, Lock, Eye, CheckCircle } from "lucide-react";

const SUPPORTED_IMAGE = /(png|jpe?g|gif|webp|bmp|svg)$/i;
const SUPPORTED_TEXT = /(txt|csv|md|json|log)$/i;

// File size limits for reliability
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB per file
const MAX_TOTAL_SIZE = 500 * 1024 * 1024; // 500MB total
const MEMORY_CHECK_INTERVAL = 30000; // 30 seconds

// Parallel processing configuration
const PARALLEL_CHUNK_SIZE = 3; // Process 3 files concurrently

function makeId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

type Preview =
  | {
      id: string;
      kind: "pdf" | "image" | "binary";
      name: string;
      url: string;
      note?: string;
    }
  | {
      id: string;
      kind: "html" | "text";
      name: string;
      content: string;
      note?: string;
    };

type DemoLog = {
  id: string;
  message: string;
};

type ProcessingPhase = "reading" | "extracting" | "converting" | "generating" | "complete";

type ProgressState = {
  currentFile: number;
  totalFiles: number;
  phase: ProcessingPhase;
  currentFileName: string;
  percentage: number;
  estimatedTimeRemaining?: number;
  filesProcessed: string[];
  isVisible: boolean;
};

export default function LocalTasteTest() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const memoryMonitorRef = useRef<NodeJS.Timeout | null>(null);
  const processingStartTimeRef = useRef<number>(0);

  const [password, setPassword] = useState("");
  const [logs, setLogs] = useState<DemoLog[]>([]);
  const [previews, setPreviews] = useState<Preview[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [memoryUsage, setMemoryUsage] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<"logs" | "previews">("logs");

  // Progress tracking state
  const [progress, setProgress] = useState<ProgressState>({
    currentFile: 0,
    totalFiles: 0,
    phase: "reading",
    currentFileName: "",
    percentage: 0,
    filesProcessed: [],
    isVisible: false,
  });

  const appendLog = useCallback((message: string) => {
    setLogs((current) => [...current, { id: makeId(), message }]);
  }, []);

  // Enhanced cleanup function with better memory management
  const reset = useCallback(() => {
    try {
      // Cancel any ongoing processing
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }

      // Clear logs
      setLogs([]);

      // Reset progress
      setProgress({
        currentFile: 0,
        totalFiles: 0,
        phase: "reading",
        currentFileName: "",
        percentage: 0,
        filesProcessed: [],
        isVisible: false,
      });

      // Clean up previews and revoke object URLs
      setPreviews((prev) => {
        prev.forEach((preview) => {
          try {
            if (preview.kind === "pdf" || preview.kind === "image" || preview.kind === "binary") {
              URL.revokeObjectURL(preview.url);
            }
          } catch (error) {
            console.warn("Failed to revoke object URL:", error);
          }
        });
        return [];
      });

      // Force garbage collection if available
      if ('gc' in window && typeof (window as any).gc === 'function') {
        (window as any).gc();
      }

      appendLog("Reset completed - memory cleaned up");
    } catch (error) {
      console.error("Error during reset:", error);
      appendLog(`Reset error: ${(error as Error).message}`);
    }
  }, [appendLog]);

  // Memory monitoring
  const checkMemoryUsage = useCallback(() => {
    try {
      if ('memory' in performance && (performance as any).memory) {
        const memory = (performance as any).memory;
        const usedMB = memory.usedJSHeapSize / (1024 * 1024);
        const limitMB = memory.jsHeapSizeLimit / (1024 * 1024);
        const usagePercent = (usedMB / limitMB) * 100;

        setMemoryUsage(usagePercent);

        if (usagePercent > 85) {
          appendLog(`⚠️ High memory usage: ${usagePercent.toFixed(1)}% - consider reducing file size`);
        }
      }
    } catch (error) {
      console.warn("Memory monitoring failed:", error);
    }
  }, [appendLog]);

  // File validation function
  const validateFiles = useCallback((fileList: FileList): { valid: boolean; totalSize: number; errors: string[] } => {
    const errors: string[] = [];
    let totalSize = 0;

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];

      // Check individual file size
      if (file.size > MAX_FILE_SIZE) {
        errors.push(`File "${file.name}" exceeds 100MB limit (${(file.size / (1024 * 1024)).toFixed(1)}MB)`);
      }

      totalSize += file.size;
    }

    // Check total size
    if (totalSize > MAX_TOTAL_SIZE) {
      errors.push(`Total file size exceeds 500MB limit (${(totalSize / (1024 * 1024)).toFixed(1)}MB)`);
    }

    return {
      valid: errors.length === 0,
      totalSize,
      errors
    };
  }, []);

  // Progress update helper
  const updateProgress = useCallback((updates: Partial<ProgressState>) => {
    setProgress(prev => {
      const newProgress = { ...prev, ...updates };

      // Calculate percentage based on phase and file progress
      if (newProgress.totalFiles > 0) {
        const basePercentage = (newProgress.currentFile / newProgress.totalFiles) * 100;
        const phaseWeights = {
          reading: 20,
          extracting: 30,
          converting: 70,
          generating: 90,
          complete: 100
        };

        newProgress.percentage = Math.min(
          basePercentage + (phaseWeights[newProgress.phase] / newProgress.totalFiles),
          100
        );
      }

      // Calculate estimated time remaining
      if (processingStartTimeRef.current && newProgress.percentage > 0 && newProgress.percentage < 100) {
        const elapsed = Date.now() - processingStartTimeRef.current;
        const estimatedTotal = (elapsed / newProgress.percentage) * 100;
        newProgress.estimatedTimeRemaining = Math.max(0, estimatedTotal - elapsed);
      }

      return newProgress;
    });
  }, []);

  // Parallel file processing function
  const processFilesInParallel = useCallback(async (
    files: File[],
    signal: AbortSignal
  ): Promise<Preview[]> => {
    const results: Preview[] = [];

    // Process files in chunks of PARALLEL_CHUNK_SIZE
    for (let i = 0; i < files.length; i += PARALLEL_CHUNK_SIZE) {
      if (signal.aborted) {
        appendLog("Processing cancelled");
        return results;
      }

      const chunk = files.slice(i, i + PARALLEL_CHUNK_SIZE);
      updateProgress({
        phase: "converting",
        currentFile: i + 1,
        currentFileName: chunk[0]?.name || "",
      });

      // Process chunk in parallel
      const chunkPromises = chunk.map(async (file, chunkIndex) => {
        const fileIndex = i + chunkIndex;

        try {
          if (signal.aborted) return null;

          updateProgress({
            currentFile: fileIndex + 1,
            currentFileName: file.name,
          });

          const name = file.name;
          const lower = name.toLowerCase();

          if (lower.endsWith(".pdf")) {
            const url = URL.createObjectURL(file);
            appendLog(`Prepared PDF preview: ${name}`);
            return { id: makeId(), kind: "pdf" as const, name, url, note: "Rendered with native PDF viewer" };
          }

          if (SUPPORTED_IMAGE.test(lower)) {
            const url = URL.createObjectURL(file);
            appendLog(`Prepared image preview: ${name}`);
            return { id: makeId(), kind: "image" as const, name, url };
          }

          if (lower.endsWith(".docx")) {
            updateProgress({ phase: "converting", currentFileName: `Converting ${name}...` });
            const mammoth = await import("mammoth/mammoth.browser");
            const arrayBuffer = await file.arrayBuffer();

            if (signal.aborted) return null;

            const result = await mammoth.convertToHtml({ arrayBuffer });
            const html = DOMPurify.sanitize(result.value || "<p>(No previewable content)</p>");
            appendLog(`Converted DOCX to HTML: ${name}`);
            return { id: makeId(), kind: "html" as const, name, content: html, note: "Mammoth → HTML → sanitized" };
          }

          if (lower.endsWith(".xlsx") || lower.endsWith(".xlsm") || lower.endsWith(".xls")) {
            updateProgress({ phase: "converting", currentFileName: `Converting ${name}...` });
            const XLSX = await import("xlsx");
            const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" });

            if (signal.aborted) return null;

            const firstSheet = workbook.SheetNames[0];
            if (firstSheet) {
              const worksheet = workbook.Sheets[firstSheet];
              const tableHtml = XLSX.utils.sheet_to_html(worksheet, { header: `<h3>${firstSheet}</h3>` });
              const html = DOMPurify.sanitize(tableHtml);
              appendLog(`Rendered XLSX sheet: ${name}`);
              return { id: makeId(), kind: "html" as const, name, content: html, note: "SheetJS HTML view (sanitized)" };
            } else {
              appendLog(`XLSX preview skipped (no sheets): ${name}`);
              return null;
            }
          }

          if (SUPPORTED_TEXT.test(lower)) {
            updateProgress({ phase: "reading", currentFileName: `Reading ${name}...` });
            const text = await file.text();

            if (signal.aborted) return null;

            const content = DOMPurify.sanitize(text).slice(0, 5000);
            appendLog(`Loaded text preview: ${name}`);
            return { id: makeId(), kind: "text" as const, name, content, note: "Plain text preview (truncated)" };
          }

          // Default binary handling
          const url = URL.createObjectURL(file);
          appendLog(`Unsupported preview type, offering download: ${name}`);
          return { id: makeId(), kind: "binary" as const, name, url, note: "Download only — unsupported preview type" };

        } catch (error) {
          appendLog(`Preview error (${name}): ${(error as Error).message}`);
          return null;
        }
      });

      // Wait for chunk to complete
      const chunkResults = await Promise.all(chunkPromises);

      // Add successful results
      chunkResults.forEach(result => {
        if (result) {
          results.push(result);
          updateProgress({
            filesProcessed: [...progress.filesProcessed, result.name]
          });
        }
      });

      // Small delay to allow UI updates
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    return results;
  }, [appendLog, updateProgress, progress.filesProcessed]);

  useEffect(() => {
    // Start memory monitoring
    memoryMonitorRef.current = setInterval(checkMemoryUsage, MEMORY_CHECK_INTERVAL);

    return () => {
      // Cleanup on unmount
      if (memoryMonitorRef.current) {
        clearInterval(memoryMonitorRef.current);
      }

      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      setPreviews((prev) => {
        prev.forEach((preview) => {
          try {
            if (preview.kind === "pdf" || preview.kind === "image" || preview.kind === "binary") {
              URL.revokeObjectURL(preview.url);
            }
          } catch (error) {
            console.warn("Failed to revoke object URL during cleanup:", error);
          }
        });
        return [];
      });
    };
  }, [checkMemoryUsage]);

  const handleFiles = useCallback(
    async (fileList: FileList | null) => {
      if (!fileList || fileList.length === 0) {
        return;
      }

      // Validate files before processing
      const validation = validateFiles(fileList);
      if (!validation.valid) {
        validation.errors.forEach(error => appendLog(`❌ Validation error: ${error}`));
        return;
      }

      // Initialize abort controller for this processing session
      abortControllerRef.current = new AbortController();
      const signal = abortControllerRef.current.signal;

      reset();
      setIsProcessing(true);
      processingStartTimeRef.current = Date.now();

      // Initialize progress with optimistic UI updates
      updateProgress({
        currentFile: 0,
        totalFiles: fileList.length,
        phase: "reading",
        currentFileName: "Initializing...",
        percentage: 0,
        filesProcessed: [],
        isVisible: true,
      });

      try {
        appendLog(`✅ Validation passed: ${fileList.length} file(s), ${(validation.totalSize / (1024 * 1024)).toFixed(1)}MB total`);
        appendLog(`Ingest: received ${fileList.length} file(s)`);

        const collected: File[] = [];
        const rawFiles = Array.from(fileList);

        updateProgress({
          phase: "extracting",
          currentFileName: "Processing archives...",
          totalFiles: rawFiles.length,
        });

        // Process archives and collect files with parallel processing
        const archivePromises = rawFiles.map(async (file, index) => {
          if (signal.aborted) return [];

          updateProgress({
            currentFile: index + 1,
            currentFileName: file.name,
            phase: "extracting",
          });

          const lower = file.name.toLowerCase();

          try {
            if (lower.endsWith(".zip")) {
              appendLog(`ZIP detected: ${file.name} — attempting in-browser extraction`);

              try {
                const zip = await import("@zip.js/zip.js");
                const reader = new zip.ZipReader(new zip.BlobReader(file));
                const entries = await reader.getEntries();

                if (!entries.length) {
                  appendLog(`ZIP empty: ${file.name}`);
                  return [];
                }

                const extractedFiles: File[] = [];
                const entryPromises = entries.map(async (entry) => {
                  if (signal.aborted) return null;

                  // Check if entry is a directory
                  if (entry.directory) {
                    appendLog(`Skipping directory entry: ${entry.filename}`);
                    return null;
                  }

                  try {
                    const blob = await entry.getData!(new zip.BlobWriter(), {
                      password: password || undefined,
                    });
                    const extractedFile = new File([blob], entry.filename, { type: blob.type });
                    appendLog(`Expanded: ${entry.filename}`);
                    return extractedFile;
                  } catch (error) {
                    appendLog(`Failed to expand ${entry.filename}: ${(error as Error).message}`);
                    return null;
                  }
                });

                const extractedResults = await Promise.all(entryPromises);
                extractedResults.forEach(file => file && extractedFiles.push(file));

                await reader.close();
                return extractedFiles;
              } catch (error) {
                appendLog(`ZIP error (${file.name}): ${(error as Error).message}`);
                return [];
              }
            } else {
              return [file];
            }
          } catch (error) {
            appendLog(`File processing error (${file.name}): ${(error as Error).message}`);
            return [];
          }
        });

        // Wait for all archive processing to complete
        const archiveResults = await Promise.all(archivePromises);
        archiveResults.forEach(files => collected.push(...files));

        if (signal.aborted) {
          appendLog("Processing cancelled");
          return;
        }

        if (!collected.length) {
          appendLog("No files available after expansion. Did the password match?");
          setIsProcessing(false);
          updateProgress({ isVisible: false });
          return;
        }

        appendLog(`Previewing ${collected.length} file(s)`);

        // Update progress for file processing phase
        updateProgress({
          phase: "converting",
          totalFiles: collected.length,
          currentFile: 0,
          currentFileName: "Starting parallel processing...",
        });

        // Process files in parallel
        const nextPreviews = await processFilesInParallel(collected, signal);

        if (signal.aborted) {
          appendLog("Processing cancelled");
          return;
        }

        setPreviews(nextPreviews);

        // Generate safe copy
        updateProgress({
          phase: "generating",
          currentFileName: "Generating safe copy...",
          percentage: 95,
        });

        try {
          const safeBlob = await buildSafeCopy();
          const opfsSaved = await persistToOpfs(safeBlob);
          if (!opfsSaved) {
            triggerDownload(safeBlob, "cupbear-safe-copy.pdf");
            appendLog("Safe copy delivered via local download");
          } else {
            appendLog("Safe copy saved to browser storage");
          }
        } catch (error) {
          appendLog(`Safe copy fallback: ${(error as Error).message}`);
        }

        updateProgress({
          phase: "complete",
          percentage: 100,
          currentFileName: "Processing complete!",
        });

        appendLog("✅ Done. Files never left the browser.");

        // Hide progress after delay
        setTimeout(() => {
          updateProgress({ isVisible: false });
        }, 3000);

      } catch (error) {
        appendLog(`❌ Processing failed: ${(error as Error).message}`);
        updateProgress({ isVisible: false });
      } finally {
        setIsProcessing(false);
        abortControllerRef.current = null;

        // Check memory after processing
        setTimeout(checkMemoryUsage, 1000);
      }
    },
    [appendLog, password, reset, validateFiles, checkMemoryUsage, updateProgress, processFilesInParallel]
  );

  const handleSample = useCallback(() => {
    const sample = new File([
      "Invoice 92431\nLine\tAmount\nService retainer\t¥120,000\n",
    ], "cupbear-invoice.txt", { type: "text/plain" });
    const list = {
      length: 1,
      item: (_: number) => sample,
      [Symbol.iterator]: function* () {
        yield sample;
      },
    } as unknown as FileList;
    void handleFiles(list);
  }, [handleFiles]);

  const handleCancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      appendLog("Processing cancelled by user");
      updateProgress({ isVisible: false });
    }
  }, [appendLog, updateProgress]);

  const isIdle = useMemo(() => !isProcessing, [isProcessing]);

  // Format time for display
  const formatTime = useCallback((ms: number) => {
    const seconds = Math.ceil(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  }, []);

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-sm text-white shadow-xl backdrop-blur">
      {/* Trust Badge Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-lg font-semibold text-white">Local clearance demo</h3>
            <div className="flex items-center gap-2 rounded-full bg-green-500/20 border border-green-500/30 px-3 py-1 text-xs font-semibold text-green-400">
              <ShieldCheck className="h-3 w-3" />
              100% Local
            </div>
          </div>
          <p className="mt-1 max-w-xl text-xs text-white/70">
            Drop a PDF, DOCX, XLSX, image, or ZIP (PPAP optional). Everything stays in-browser. We expand archives, preview sanitised content, and rebuild a safe-copy PDF.
          </p>
          {memoryUsage > 0 && (
            <p className="mt-1 text-xs text-white/50">
              Memory usage: {memoryUsage.toFixed(1)}%
              {memoryUsage > 75 && <span className="text-yellow-400"> (High)</span>}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleSample}
            className="rounded-full border border-white/30 px-4 py-2 text-xs font-semibold text-white transition hover:border-white/60 hover:bg-white/10"
            disabled={!isIdle}
          >
            Try with sample text
          </button>
          {isProcessing && (
            <button
              type="button"
              onClick={handleCancel}
              className="rounded-full border border-red-400/30 px-4 py-2 text-xs font-semibold text-red-400 transition hover:border-red-400/60 hover:bg-red-400/10"
            >
              Cancel
            </button>
          )}
        </div>
      </div>

      {/* Local Processing Security Indicator */}
      {isProcessing && (
        <div className="mb-4 rounded-xl border border-green-400/30 bg-green-400/10 p-3">
          <div className="flex items-center gap-2 text-green-400 font-semibold text-sm">
            <div className="flex items-center gap-1">
              <Eye className="h-4 w-4 animate-pulse" />
              <span>Processing locally</span>
            </div>
            <div className="flex items-center gap-1 text-xs">
              <Lock className="h-3 w-3" />
              <span>No data leaves browser</span>
            </div>
          </div>
        </div>
      )}

      {/* Progress Indicator */}
      {progress.isVisible && (
        <div className="mt-4 rounded-xl border border-blue-400/20 bg-blue-400/5 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-semibold text-blue-400">
              {progress.phase === "reading" && "📖 Reading files"}
              {progress.phase === "extracting" && "📦 Extracting archives"}
              {progress.phase === "converting" && "🔄 Converting files"}
              {progress.phase === "generating" && "📄 Generating safe copy"}
              {progress.phase === "complete" && "✅ Complete"}
            </div>
            <div className="text-xs text-white/60">
              {progress.currentFile}/{progress.totalFiles} files
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-white/10 rounded-full h-2 mb-3 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-400 to-blue-500 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${progress.percentage}%` }}
            />
          </div>

          {/* Status Information */}
          <div className="flex items-center justify-between text-xs">
            <div className="text-white/80 font-medium">
              {progress.currentFileName && (
                <div className="truncate max-w-48">
                  {progress.currentFileName}
                </div>
              )}
            </div>
            <div className="flex items-center gap-3 text-white/60">
              <span>{progress.percentage.toFixed(0)}%</span>
              {progress.estimatedTimeRemaining && progress.percentage < 100 && (
                <span>~{formatTime(progress.estimatedTimeRemaining)} remaining</span>
              )}
            </div>
          </div>

          {/* Files Processed List */}
          {progress.filesProcessed.length > 0 && (
            <div className="mt-3 pt-3 border-t border-white/10">
              <div className="text-xs text-white/60 mb-2">Recently processed:</div>
              <div className="flex flex-wrap gap-1">
                {progress.filesProcessed.slice(-5).map((fileName, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 bg-green-400/20 text-green-400 rounded text-xs border border-green-400/20"
                  >
                    ✓ {fileName}
                  </span>
                ))}
                {progress.filesProcessed.length > 5 && (
                  <span className="px-2 py-1 bg-white/10 text-white/60 rounded text-xs">
                    +{progress.filesProcessed.length - 5} more
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="mt-4 flex flex-col gap-4 rounded-2xl border border-white/10 bg-[var(--brand-darker)]/40 p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <label className="inline-flex cursor-pointer flex-wrap items-center gap-3 text-xs font-semibold uppercase tracking-[0.2em] text-white/70">
            <span className="rounded-full bg-[var(--accent)]/20 px-3 py-1 text-[var(--accent)]">Step 1</span>
            Upload files
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(event) => void handleFiles(event.target.files)}
              disabled={!isIdle}
            />
            <span
              onClick={() => fileInputRef.current?.click()}
              className={`inline-flex items-center gap-2 rounded-full border border-white/20 px-3 py-1 text-white transition hover:bg-white/10 ${
                isIdle ? "cursor-pointer" : "cursor-not-allowed opacity-60"
              }`}
            >
              Browse
            </span>
          </label>
          <div className="flex flex-1 items-center gap-2 text-xs text-white/70">
            <span>PPAP password</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Optional"
              className="flex-1 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs text-white placeholder:text-white/40 focus:border-[var(--accent)] focus:outline-none"
              disabled={!isIdle}
            />
          </div>
        </div>

        {/* Mobile-responsive layout with tabs on small screens, grid on large screens */}
        <div className="block lg:hidden">
          {/* Mobile Tab Layout */}
          <div className="mb-4 flex rounded-lg border border-white/10 bg-black/20 p-1">
            <button
              className={`flex-1 rounded-md px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] transition ${
                activeTab === "logs"
                  ? "bg-[var(--accent)]/20 text-[var(--accent)]"
                  : "text-white/60 hover:text-white/80"
              }`}
              onClick={() => setActiveTab("logs")}
            >
              Activity Log
              {isProcessing && <span className="ml-2 animate-pulse">●</span>}
            </button>
            <button
              className={`flex-1 rounded-md px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] transition ${
                activeTab === "previews"
                  ? "bg-[var(--accent)]/20 text-[var(--accent)]"
                  : "text-white/60 hover:text-white/80"
              }`}
              onClick={() => setActiveTab("previews")}
            >
              Previews
              {previews.length > 0 && (
                <span className="ml-2 rounded-full bg-[var(--accent)]/30 px-1.5 py-0.5 text-[10px]">
                  {previews.length}
                </span>
              )}
            </button>
          </div>

          {/* Mobile Tab Content */}
          <div className="space-y-3">
            {activeTab === "logs" && (
              <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.2em] text-white/60">
                  <span>Activity log</span>
                  {isProcessing && <span className="animate-pulse text-[var(--accent)]">Processing…</span>}
                </div>
                <ul className="mt-3 flex max-h-64 flex-col gap-2 overflow-auto pr-1 text-xs leading-relaxed text-white/80">
                  {logs.map((entry) => (
                    <li key={entry.id} className="border-b border-white/5 pb-2 last:border-0 last:pb-0">
                      • {entry.message}
                    </li>
                  ))}
                  {!logs.length && <li className="text-white/60">Waiting for files…</li>}
                </ul>
              </div>
            )}

            {activeTab === "previews" && (
              <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/60">Previews</div>
                <div className="mt-3 flex max-h-64 flex-col gap-3 overflow-auto pr-1 text-xs text-white/80">
                  {!previews.length && <p className="text-white/60">No previews yet.</p>}
                  {previews.map((preview) => {
                    if (preview.kind === "pdf") {
                      return (
                        <figure key={preview.id} className="space-y-1">
                          <figcaption className="text-[11px] uppercase tracking-[0.2em] text-white/60">
                            {preview.name}
                          </figcaption>
                          <object data={preview.url} type="application/pdf" className="h-40 w-full rounded-lg border border-white/10 bg-white"></object>
                          {preview.note && <p className="text-[10px] text-white/50">{preview.note}</p>}
                        </figure>
                      );
                    }

                    if (preview.kind === "image") {
                      return (
                        <figure key={preview.id} className="space-y-1">
                          <figcaption className="text-[11px] uppercase tracking-[0.2em] text-white/60">
                            {preview.name}
                          </figcaption>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={preview.url} alt={preview.name} className="h-40 w-full rounded-lg object-contain" />
                          {preview.note && <p className="text-[10px] text-white/50">{preview.note}</p>}
                        </figure>
                      );
                    }

                    if (preview.kind === "binary") {
                      return (
                        <div key={preview.id} className="space-y-1">
                          <div className="text-[11px] uppercase tracking-[0.2em] text-white/60">{preview.name}</div>
                          <a
                            href={preview.url}
                            download={preview.name}
                            className="inline-flex items-center gap-2 rounded-full border border-white/30 px-3 py-1 text-xs text-white transition hover:bg-white/10"
                          >
                            Download original fragment
                          </a>
                          {preview.note && <p className="text-[10px] text-white/50">{preview.note}</p>}
                        </div>
                      );
                    }

                    if (preview.kind === "html") {
                      return (
                        <figure key={preview.id} className="space-y-1">
                          <figcaption className="text-[11px] uppercase tracking-[0.2em] text-white/60">
                            {preview.name}
                          </figcaption>
                          <div
                            className="h-40 overflow-auto rounded-lg border border-white/10 bg-white/90 p-3 text-[11px] text-slate-700"
                            dangerouslySetInnerHTML={{ __html: preview.content }}
                          />
                          {preview.note && <p className="text-[10px] text-white/50">{preview.note}</p>}
                        </figure>
                      );
                    }

                    // Text preview case
                    if (preview.kind === "text" && "content" in preview) {
                      return (
                        <figure key={preview.id} className="space-y-1">
                          <figcaption className="text-[11px] uppercase tracking-[0.2em] text-white/60">
                            {preview.name}
                          </figcaption>
                          <pre className="h-40 overflow-auto rounded-lg border border-white/10 bg-black/40 p-3 text-[11px] text-white/80">
                            {preview.content}
                          </pre>
                          {preview.note && <p className="text-[10px] text-white/50">{preview.note}</p>}
                        </figure>
                      );
                    }

                    return null;
                  })}
                </div>
              </div>
            )}

            {/* Enhanced Privacy Notice */}
            <div className="rounded-lg border border-white/10 bg-black/30 p-3 text-[10px] text-white/60">
              <div className="flex items-center gap-2 mb-2 text-green-400 font-semibold">
                <ShieldCheck className="h-3 w-3" />
                <span>Privacy & Security Guarantee</span>
              </div>
              <p className="mb-2">
                This widget runs entirely in your browser. Files never leave your device. All processing happens locally using WebAssembly and client-side JavaScript libraries.
              </p>
              <div className="flex items-center gap-4 text-xs">
                <div className="flex items-center gap-1">
                  <Lock className="h-3 w-3 text-green-400" />
                  <span>Zero server uploads</span>
                </div>
                <div className="flex items-center gap-1">
                  <CheckCircle className="h-3 w-3 text-green-400" />
                  <span>Local processing only</span>
                </div>
              </div>
              <p className="mt-2 text-white/40">
                Limits: 100MB per file, 500MB total. Processing can be cancelled at any time.
              </p>
            </div>
          </div>
        </div>

        {/* Desktop Grid Layout */}
        <div className="hidden lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-4">
          <div className="rounded-xl border border-white/10 bg-black/20 p-4">
            <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.2em] text-white/60">
              <span>Activity log</span>
              {isProcessing && <span className="animate-pulse text-[var(--accent)]">Processing…</span>}
            </div>
            <ul className="mt-3 flex max-h-48 flex-col gap-2 overflow-auto pr-1 text-xs leading-relaxed text-white/80">
              {logs.map((entry) => (
                <li key={entry.id} className="border-b border-white/5 pb-2 last:border-0 last:pb-0">
                  • {entry.message}
                </li>
              ))}
              {!logs.length && <li className="text-white/60">Waiting for files…</li>}
            </ul>
          </div>

          <div className="space-y-3">
            <div className="rounded-xl border border-white/10 bg-black/20 p-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/60">Previews</div>
              <div className="mt-3 flex max-h-48 flex-col gap-3 overflow-auto pr-1 text-xs text-white/80">
                {!previews.length && <p className="text-white/60">No previews yet.</p>}
                {previews.map((preview) => {
                  if (preview.kind === "pdf") {
                    return (
                      <figure key={preview.id} className="space-y-1">
                        <figcaption className="text-[11px] uppercase tracking-[0.2em] text-white/60">
                          {preview.name}
                        </figcaption>
                        <object data={preview.url} type="application/pdf" className="h-32 w-full rounded-lg border border-white/10 bg-white"></object>
                        {preview.note && <p className="text-[10px] text-white/50">{preview.note}</p>}
                      </figure>
                    );
                  }

                  if (preview.kind === "image") {
                    return (
                      <figure key={preview.id} className="space-y-1">
                        <figcaption className="text-[11px] uppercase tracking-[0.2em] text-white/60">
                          {preview.name}
                        </figcaption>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={preview.url} alt={preview.name} className="h-32 w-full rounded-lg object-contain" />
                        {preview.note && <p className="text-[10px] text-white/50">{preview.note}</p>}
                      </figure>
                    );
                  }

                  if (preview.kind === "binary") {
                    return (
                      <div key={preview.id} className="space-y-1">
                        <div className="text-[11px] uppercase tracking-[0.2em] text-white/60">{preview.name}</div>
                        <a
                          href={preview.url}
                          download={preview.name}
                          className="inline-flex items-center gap-2 rounded-full border border-white/30 px-3 py-1 text-xs text-white transition hover:bg-white/10"
                        >
                          Download original fragment
                        </a>
                        {preview.note && <p className="text-[10px] text-white/50">{preview.note}</p>}
                      </div>
                    );
                  }

                  if (preview.kind === "html") {
                    return (
                      <figure key={preview.id} className="space-y-1">
                        <figcaption className="text-[11px] uppercase tracking-[0.2em] text-white/60">
                          {preview.name}
                        </figcaption>
                        <div
                          className="h-32 overflow-auto rounded-lg border border-white/10 bg-white/90 p-3 text-[11px] text-slate-700"
                          dangerouslySetInnerHTML={{ __html: preview.content }}
                        />
                        {preview.note && <p className="text-[10px] text-white/50">{preview.note}</p>}
                      </figure>
                    );
                  }

                  // Text preview case
                  if (preview.kind === "text" && "content" in preview) {
                    return (
                      <figure key={preview.id} className="space-y-1">
                        <figcaption className="text-[11px] uppercase tracking-[0.2em] text-white/60">
                          {preview.name}
                        </figcaption>
                        <pre className="h-32 overflow-auto rounded-lg border border-white/10 bg-black/40 p-3 text-[11px] text-white/80">
                          {preview.content}
                        </pre>
                        {preview.note && <p className="text-[10px] text-white/50">{preview.note}</p>}
                      </figure>
                    );
                  }

                  return null;
                })}
              </div>
            </div>

            {/* Enhanced Privacy Notice */}
            <div className="rounded-lg border border-white/10 bg-black/30 p-3 text-[10px] text-white/60">
              <div className="flex items-center gap-2 mb-2 text-green-400 font-semibold">
                <ShieldCheck className="h-3 w-3" />
                <span>Privacy & Security Guarantee</span>
              </div>
              <p className="mb-2">
                This widget runs entirely in your browser. Files never leave your device. All processing happens locally using WebAssembly and client-side JavaScript libraries.
              </p>
              <div className="flex items-center gap-4 text-xs">
                <div className="flex items-center gap-1">
                  <Lock className="h-3 w-3 text-green-400" />
                  <span>Zero server uploads</span>
                </div>
                <div className="flex items-center gap-1">
                  <CheckCircle className="h-3 w-3 text-green-400" />
                  <span>Local processing only</span>
                </div>
              </div>
              <p className="mt-2 text-white/40">
                Limits: 100MB per file, 500MB total. Processing can be cancelled at any time.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

async function buildSafeCopy() {
  try {
    const { PDFDocument, rgb } = await import("pdf-lib");
    const pdf = await PDFDocument.create();
    const page = pdf.addPage([595, 842]);
    page.drawRectangle({ x: 0, y: 0, width: 595, height: 842, color: rgb(0.97, 0.98, 0.99) });
    page.drawText("CupBear demo — safe copy", {
      x: 48,
      y: 780,
      size: 18,
      color: rgb(0.11, 0.25, 0.48),
    });
    page.drawText("In the live system this PDF would be rebuilt from rasterised pages only.", {
      x: 48,
      y: 750,
      size: 11,
      color: rgb(0.2, 0.2, 0.2),
    });
    const bytes = await pdf.save();
    return new Blob([bytes], { type: "application/pdf" });
  } catch (error) {
    throw new Error(`Failed to build safe copy: ${(error as Error).message}`);
  }
}

async function persistToOpfs(blob: Blob) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const storage = (navigator as any).storage;
    if (!storage?.getDirectory) {
      return false;
    }
    const root = await storage.getDirectory();
    const fileHandle = await root.getFileHandle("cupbear-safe-copy.pdf", { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(blob);
    await writable.close();
    return true;
  } catch (error) {
    console.warn("OPFS write failed", error);
    return false;
  }
}

function triggerDownload(blob: Blob, filename: string) {
  try {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error("Download trigger failed:", error);
  }
}