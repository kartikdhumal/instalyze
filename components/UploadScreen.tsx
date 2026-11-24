"use client";

import { useRef, useState } from "react";
import {
  ArrowDownToLine,
  ArrowRight,
  BarChart3,
  FileArchive,
  LockKeyhole,
  MessageCircle,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

interface UploadScreenProps {
  readonly loading: boolean;
  readonly loadingMessage?: string;
  readonly progress: { done: number; total: number } | null;
  readonly onFile: (file: File) => void;
}

const STEPS = [
  {
    title: "Open Accounts Center",
    description: "Go to Settings → Accounts Center → Your information and permissions.",
  },
  {
    title: "Request your download",
    description: "Choose Download your information, then select Messages.",
  },
  {
    title: "Choose the right format",
    description: "Select Download to device and set the format to JSON.",
  },
  {
    title: "Drop your archive here",
    description: "When Instagram emails your download, choose the ZIP file above.",
  },
];

const FEATURES = [
  { icon: BarChart3, label: "Conversation insights" },
  { icon: MessageCircle, label: "Searchable messages" },
  { icon: ShieldCheck, label: "Private by design" },
];

export function UploadScreen({ loading, loadingMessage, progress, onFile }: UploadScreenProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const pick = (file: File | undefined) => {
    if (file && !loading) onFile(file);
  };

  const percent = progress && progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;

  return (
    <main className="relative flex-1 overflow-hidden bg-background">
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-56 left-[8%] h-[34rem] w-[34rem] rounded-full bg-[#dd2a7b]/15 blur-[120px]" />
        <div className="absolute top-20 right-[-12rem] h-[34rem] w-[34rem] rounded-full bg-[#8134af]/15 blur-[130px]" />
        <div className="absolute bottom-[-18rem] left-[38%] h-[34rem] w-[34rem] rounded-full bg-[#f58529]/10 blur-[130px]" />
        <div className="absolute inset-0 bg-[radial-gradient(var(--border)_0.7px,transparent_0.7px)] [background-size:24px_24px] opacity-20 [mask-image:linear-gradient(to_bottom,black,transparent_70%)]" />
      </div>

      <div className="relative mx-auto flex w-full max-w-7xl flex-col px-5 pb-10 pt-10 sm:px-8 sm:pt-14 lg:px-10 lg:pt-20">
        <section className="grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
          <div className="max-w-2xl">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border/80 bg-card/70 px-3.5 py-1.5 text-xs font-medium text-muted-foreground shadow-sm backdrop-blur">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-50" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
              </span>
              Your messages. Your device. Your insights.
            </div>

            <h1 className="font-display text-5xl font-extrabold leading-[1.03] tracking-[-2.5px] sm:text-6xl lg:text-7xl">
              Your DMs,
              <br />
              <span className="bg-gradient-to-r from-[#f58529] via-[#dd2a7b] to-[#8134af] bg-clip-text text-transparent">
                seen differently.
              </span>
            </h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
              Turn your Instagram message export into a little more insight //#endregionand a lot of memories. Explore conversation
              stats, find old messages, and revisit every chat.
            </p>

            <div className="mt-8 flex flex-wrap gap-2.5">
              {FEATURES.map(({ icon: Icon, label }) => (
                <span
                  key={label}
                  className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-card/70 px-3 py-2 text-xs font-medium text-foreground/80 backdrop-blur sm:text-sm"
                >
                  <Icon className="h-4 w-4 text-[#dd2a7b]" />
                  {label}
                </span>
              ))}
            </div>

            <div className="mt-10 hidden items-center gap-4 border-t border-border/70 pt-6 sm:flex">
              <div className="flex -space-x-2">
                {["bg-[#f58529]", "bg-[#dd2a7b]", "bg-[#8134af]"].map((color, index) => (
                  <span
                    key={color}
                    className={`grid h-9 w-9 place-items-center rounded-full border-2 border-background ${color} text-white`}
                  >
                    {index === 0 ? <BarChart3 className="h-4 w-4" /> : index === 1 ? <MessageCircle className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
                  </span>
                ))}
              </div>
              <p className="text-sm text-muted-foreground">
                A thoughtful way to look back on the conversations that matter.
              </p>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-xl">
            <div aria-hidden className="absolute -inset-4 rounded-[2rem] bg-gradient-to-br from-[#f58529]/20 via-[#dd2a7b]/20 to-[#8134af]/20 blur-2xl" />
            <div className="relative overflow-hidden rounded-[1.75rem] border border-border/80 bg-card/85 p-5 shadow-[0_24px_100px_-40px_rgba(221,42,123,0.35)] backdrop-blur-xl sm:p-7">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-sm font-semibold">Start with your archive</div>
                  <p className="mt-1 text-sm text-muted-foreground">One export, a whole new perspective.</p>
                </div>
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-[#f58529] via-[#dd2a7b] to-[#8134af] text-white shadow-lg shadow-[#dd2a7b]/20">
                  <Sparkles className="h-5 w-5" />
                </span>
              </div>

              <div
                className={`mt-6 rounded-2xl p-[1px] transition-all ${
                  dragging
                    ? "bg-gradient-to-br from-[#f58529] via-[#dd2a7b] to-[#8134af] shadow-[0_0_32px_-8px_rgba(221,42,123,0.6)]"
                    : "bg-border"
                }`}
              >
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
                  className={`flex min-h-56 w-full flex-col items-center justify-center rounded-[calc(1rem-1px)] border border-dashed border-border bg-background/70 px-5 py-8 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    dragging ? "bg-primary/5" : "hover:bg-muted/40"
                  } ${loading ? "cursor-progress" : "cursor-pointer"}`}
                >
                  <span className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-[#f58529]/15 via-[#dd2a7b]/15 to-[#8134af]/15 text-[#dd2a7b]">
                    {loading ? <ArrowDownToLine className="h-7 w-7 animate-bounce" /> : <FileArchive className="h-7 w-7" />}
                  </span>
                  {loading ? (
                    <div className="w-full max-w-sm">
                      <span className="text-sm font-semibold">
                        {loadingMessage ?? "Reading your conversations"}
                        {progress ? ` · ${progress.done.toLocaleString()} / ${progress.total.toLocaleString()}` : ""}
                      </span>
                      <div
                        className="mt-4 h-2 overflow-hidden rounded-full bg-muted"
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
                      <span className="text-base font-semibold">Drop your Instagram ZIP here</span>
                      <span className="mt-1 text-sm text-muted-foreground">or browse files on your device</span>
                      <span className="mt-5 inline-flex items-center gap-2 rounded-xl bg-foreground px-4 py-2.5 text-sm font-semibold text-background transition-transform group-hover:translate-y-[-1px]">
                        Choose ZIP file <ArrowRight className="h-4 w-4" />
                      </span>
                    </>
                  )}
                </button>
              </div>

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

              <div className="mt-5 flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <LockKeyhole className="h-4 w-4 shrink-0 text-emerald-500" />
                <span>Saved in this browser for next time. Never uploaded.</span>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-16 border-t border-border/70 pt-8 sm:mt-20 sm:pt-10">
          <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#dd2a7b]">Getting started</p>
              <h2 className="mt-2 font-display text-2xl font-bold tracking-tight sm:text-3xl">Get your messages in 4 steps</h2>
            </div>
            <p className="max-w-md text-sm leading-6 text-muted-foreground">
              Download a copy of your Instagram messages, then open the ZIP right here.
            </p>
          </div>

          <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((step, index) => (
              <li key={step.title} className="rounded-2xl border border-border/80 bg-card/55 p-4 sm:p-5">
                <div className="mb-4 flex items-center justify-between">
                  <span className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br from-[#f58529] via-[#dd2a7b] to-[#8134af] text-sm font-bold text-white">
                    {index + 1}
                  </span>
                  {index < STEPS.length - 1 && <ArrowRight className="h-4 w-4 text-muted-foreground/60" />}
                </div>
                <h3 className="text-sm font-semibold">{step.title}</h3>
                <p className="mt-1.5 text-sm leading-5 text-muted-foreground">{step.description}</p>
              </li>
            ))}
          </ol>
        </section>

        <footer className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-border/70 py-5 text-xs text-muted-foreground sm:flex-row">
          <span>Made for the messages worth keeping.</span>
          <span className="inline-flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4 text-emerald-500" />
            Private, local, and yours
          </span>
        </footer>
      </div>
    </main>
  );
}
