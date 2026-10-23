"use client";

import { useRef, useState } from "react";
import { FileArchive, Lock } from "lucide-react";

interface UploadScreenProps {
  readonly loading: boolean;
  readonly progress: { done: number; total: number } | null;
  readonly onFile: (file: File) => void;
}

const STEPS = [
  "Instagram app → Settings → Accounts Center → Your information and permissions",
  "Download your information → Some of your information → tick Messages",
  "Choose Download to device, Format JSON, then submit",
  "Download the zip when Instagram emails you and drop it here",
];

export function UploadScreen({ loading, progress, onFile }: UploadScreenProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const pick = (file: File | undefined) => {
    if (file && !loading) onFile(file);
  };

  const percent = progress && progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;

  let borderClass = "border-border bg-card hover:bg-surface-hover";
  if (dragging) borderClass = "border-primary bg-primary/10";

  return (
    <main className="flex-1 flex flex-col items-center justify-center px-4 py-12">
      <h1 className="font-display text-4xl md:text-5xl font-extrabold tracking-[-1px] text-center mb-3">
        <span className="bg-gradient-to-r from-[#f58529] via-[#dd2a7b] to-[#8134af] bg-clip-text text-transparent">
          Instalyze
        </span>
      </h1>
      <p className="text-muted-foreground text-center max-w-xl mb-8">
        Drop your Instagram data export, pick a conversation and see its analytics and full message history.
      </p>

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
        className={`w-full max-w-xl rounded-2xl border-2 border-dashed p-10 flex flex-col items-center gap-3 transition-colors ${borderClass} ${loading ? "cursor-progress" : "cursor-pointer"}`}
      >
        <FileArchive className="w-10 h-10 text-primary" />
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
            <span className="font-semibold">Drop your Instagram zip here</span>
            <span className="text-sm text-muted-foreground">or click to choose the file</span>
          </>
        )}
      </button>
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
        <Lock className="w-3.5 h-3.5" />
        Everything is read inside your browser. Nothing is uploaded anywhere.
      </p>

      <div className="w-full max-w-xl mt-10 bg-card border border-border rounded-xl p-5">
        <h2 className="font-display font-semibold mb-3">How to get the zip</h2>
        <ol className="space-y-2 text-sm text-muted-foreground list-decimal list-inside">
          {STEPS.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </div>
    </main>
  );
}
