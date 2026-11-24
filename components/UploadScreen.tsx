"use client";

import { useRef, useState } from "react";
import { ArrowDownToLine, FileArchive, LockKeyhole } from "lucide-react";

interface UploadScreenProps {
  readonly loading: boolean;
  readonly loadingMessage?: string;
  readonly progress: { done: number; total: number } | null;
  readonly onFile: (file: File) => void;
}

const STEPS = [
  "Open Instagram Settings → Accounts Center → Your information and permissions.",
  "Choose Download your information, then select Messages.",
  "Download to device in JSON format. When ready, choose the ZIP file above.",
];

export function UploadScreen({ loading, loadingMessage, progress, onFile }: UploadScreenProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const pick = (file: File | undefined) => {
    if (file && !loading) onFile(file);
  };

  const percent = progress && progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;

  return (
    <main className="flex-1 bg-background">
      <div className="mx-auto flex min-h-[calc(100dvh-64px)] w-full max-w-xl flex-col justify-center px-4 py-5 sm:px-6 sm:py-8">
        <div className="mb-5 text-center sm:mb-6">
          <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">Upload your ZIP file</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">Open your Instagram conversations and analytics.</p>
        </div>

        <section className="rounded-2xl border border-border bg-card p-3.5 shadow-sm sm:p-5">
          <button
            type="button"
            disabled={loading}
            onClick={() => inputRef.current?.click()}
            onDragOver={(event) => {
              event.preventDefault();
              if (!loading) setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(event) => {
              event.preventDefault();
              setDragging(false);
              pick(event.dataTransfer.files[0]);
            }}
            className={`flex min-h-48 w-full flex-col items-center justify-center rounded-xl border border-dashed px-4 py-6 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              dragging
                ? "border-[#dd2a7b] bg-[#dd2a7b]/5"
                : "border-border bg-background hover:border-[#dd2a7b]/60 hover:bg-muted/40"
            } ${loading ? "cursor-progress" : "cursor-pointer"}`}
          >
            <span className="mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-[#f58529] via-[#dd2a7b] to-[#8134af] text-white">
              {loading ? <ArrowDownToLine className="h-6 w-6 animate-bounce" /> : <FileArchive className="h-6 w-6" />}
            </span>
            {loading ? (
              <div className="w-full max-w-sm">
                <span className="text-sm font-semibold">
                  {loadingMessage ?? "Reading your conversations"}
                  {progress ? ` · ${progress.done.toLocaleString()} / ${progress.total.toLocaleString()}` : ""}
                </span>
                <div
                  className="mt-3 h-2 overflow-hidden rounded-full bg-muted"
                  role="progressbar"
                  aria-label="Reading conversations"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={percent}
                >
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#f58529] via-[#dd2a7b] to-[#8134af] transition-all duration-300"
                    style={{ width: `${percent}%` }}
                  />
                </div>
              </div>
            ) : (
              <>
                <span className="text-sm font-semibold">Drop your Instagram ZIP here</span>
                <span className="mt-1 text-xs text-muted-foreground">or browse files on your device</span>
                <span className="mt-4 rounded-lg bg-foreground px-4 py-2 text-sm font-semibold text-background">
                  Choose ZIP file
                </span>
              </>
            )}
          </button>

          <input
            ref={inputRef}
            type="file"
            accept=".zip,application/zip"
            className="hidden"
            onChange={(event) => {
              pick(event.target.files?.[0]);
              event.target.value = "";
            }}
          />

          <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
            <LockKeyhole className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
            Saved in this browser. Never uploaded.
          </p>
        </section>

        <details className="mt-3 rounded-xl border border-border/80 bg-card/60 px-4">
          <summary className="cursor-pointer py-3 text-center text-sm font-medium text-muted-foreground hover:text-foreground">
            How do I get my Instagram ZIP?
          </summary>
          <ol className="space-y-3 border-t border-border py-3">
            {STEPS.map((step, index) => (
              <li key={step} className="flex items-start gap-3 text-sm text-muted-foreground">
                <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-muted text-xs font-semibold text-foreground">
                  {index + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </details>
      </div>
    </main>
  );
}
