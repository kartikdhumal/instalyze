"use client";

import { useRef, useState } from "react";
import { FileArchive, Lock, Sparkles } from "lucide-react";

interface UploadScreenProps {
  readonly loading: boolean;
  readonly progress: { done: number; total: number } | null;
  readonly onFile: (file: File) => void;
}

const STEPS = [
  "Instagram → Settings → Accounts Center → Your information and permissions",
  "Download your information → Some of your information → tick Messages",
  "Choose Download to device, Format JSON, then submit",
  "Download the zip Instagram emails you, then drop it here",
];

export function UploadScreen({ loading, progress, onFile }: UploadScreenProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const pick = (file: File | undefined) => {
    if (file && !loading) onFile(file);
  };

  const percent = progress && progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;

  return (
    <main className="relative flex-1 min-h-0 overflow-hidden">
      {/* Instagram-gradient glow field */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-28 -left-24 h-72 w-72 rounded-full bg-[#f58529]/30 blur-3xl" />
        <div className="absolute top-1/4 right-[-6rem] h-80 w-80 rounded-full bg-[#dd2a7b]/30 blur-3xl" />
        <div className="absolute -bottom-28 left-1/3 h-72 w-72 rounded-full bg-[#8134af]/30 blur-3xl" />
      </div>

      <div className="relative h-full flex items-center justify-center px-4 py-4 sm:py-6">
        <div className="w-full max-w-5xl grid gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:gap-12 items-center">
          {/* ── Hero + upload ───────────────────────────────── */}
          <div className="flex flex-col items-center lg:items-start text-center lg:text-left">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card/70 backdrop-blur px-3 py-1 text-xs font-medium text-muted-foreground">
              <Sparkles className="w-3.5 h-3.5 text-[#dd2a7b]" />
              Instagram DM analytics
            </span>

            <h1 className="font-display text-4xl sm:text-5xl font-extrabold tracking-[-1.5px] mt-4">
              <span className="bg-gradient-to-r from-[#f58529] via-[#dd2a7b] to-[#8134af] bg-clip-text text-transparent">
                Instalyze
              </span>
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground max-w-md mt-2.5">
              Drop your Instagram export, pick a conversation and relive it — stats, streaks and the full message history.
            </p>

            {/* Gradient story-ring drop zone */}
            <div
              className={`w-full max-w-md mt-5 rounded-3xl p-[2px] transition-all ${
                dragging
                  ? "bg-gradient-to-br from-[#f58529] via-[#dd2a7b] to-[#8134af] shadow-[0_0_40px_-8px_rgba(221,42,123,0.6)]"
                  : "bg-gradient-to-br from-[#f58529]/60 via-[#dd2a7b]/60 to-[#8134af]/60"
              }`}
            >
              <button
                type="button"
                disabled={loading}
                onClick={() => inputRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  if (!loading) setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragging(false);
                  pick(e.dataTransfer.files[0]);
                }}
                className={`w-full rounded-[calc(1.5rem-2px)] bg-card px-6 py-7 sm:py-8 flex flex-col items-center gap-3 transition-colors ${
                  dragging ? "bg-primary/5" : "hover:bg-surface-hover"
                } ${loading ? "cursor-progress" : "cursor-pointer"}`}
              >
                <span className="grid place-items-center h-14 w-14 rounded-2xl bg-gradient-to-br from-[#f58529] via-[#dd2a7b] to-[#8134af] text-white shadow-lg">
                  <FileArchive className="w-7 h-7" />
                </span>
                {loading ? (
                  <div className="w-full flex flex-col items-center gap-3">
                    <span className="text-sm font-medium">
                      Reading conversations {progress ? `${progress.done} / ${progress.total}` : ""}
                    </span>
                    <div className="w-full h-2.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[#f58529] via-[#dd2a7b] to-[#8134af] transition-all duration-300"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                ) : (
                  <>
                    <span className="font-semibold text-center">Drop your Instagram zip here</span>
                    <span className="text-sm text-muted-foreground text-center">or click to choose the file</span>
                  </>
                )}
              </button>
            </div>

            <input
              ref={inputRef}
              type="file"
              accept=".zip,application/zip"
              className="hidden"
              onChange={(e) => {
                pick(e.target.files?.[0]);
                e.target.value = "";
              }}
            />

            <p className="flex items-center gap-1.5 text-xs text-muted-foreground mt-4">
              <Lock className="w-3.5 h-3.5 shrink-0" />
              Everything is read in your browser. Nothing is uploaded.
            </p>
          </div>

          {/* ── How to get the zip ──────────────────────────── */}
          <div className="w-full rounded-3xl border border-border bg-card/70 backdrop-blur-md p-5 sm:p-6 shadow-sm">
            <h2 className="font-display text-lg font-semibold mb-4">Get your data in 4 steps</h2>
            <ol className="space-y-3">
              {STEPS.map((step, i) => (
                <li key={step} className="flex items-start gap-3">
                  <span className="grid place-items-center shrink-0 h-7 w-7 rounded-full bg-gradient-to-br from-[#f58529] via-[#dd2a7b] to-[#8134af] text-white text-xs font-bold">
                    {i + 1}
                  </span>
                  <span className="text-sm text-muted-foreground leading-snug pt-0.5">{step}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </main>
  );
}
