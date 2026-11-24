"use client";

import { useEffect, useMemo, useState } from "react";
import { BarChart3, Loader2, Menu, MessageCircle, Sparkles, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { AnalyticsView } from "@/components/AnalyticsView";
import { ChatView } from "@/components/chat/ChatView";
import { ConversationPicker } from "@/components/ConversationPicker";
import { ThemeToggle } from "@/components/ThemeToggle";
import { UploadScreen } from "@/components/UploadScreen";
import { computeAnalytics } from "@/lib/analytics";
import { openInstagramArchive, type InstagramArchive } from "@/lib/instagram/archive";
import {
  clearSavedArchive,
  readSavedArchive,
  readSavedArchiveView,
  saveArchive,
  saveArchiveView,
} from "@/lib/instagram/archiveStorage";
import type { ChatMessage } from "@/lib/instagram/types";

type Tab = "analytics" | "chat";

const TABS: { key: Tab; label: string; icon: typeof BarChart3 }[] = [
  { key: "analytics", label: "Analytics", icon: BarChart3 },
  { key: "chat", label: "Messages", icon: MessageCircle },
];

export default function HomePage() {
  const [archive, setArchive] = useState<InstagramArchive | null>(null);
  const [opening, setOpening] = useState(false);
  const [restoring, setRestoring] = useState(true);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [loaded, setLoaded] = useState<{ id: string; messages: ChatMessage[] } | null>(null);
  const [tab, setTab] = useState<Tab>("analytics");
  const [menuOpen, setMenuOpen] = useState(false);

  const thread = archive?.threads.find((t) => t.id === threadId) ?? null;
  const messages = loaded?.id === threadId ? loaded.messages : null;

  const analytics = useMemo(
    () => (thread && messages ? computeAnalytics(messages, thread.title) : null),
    [thread, messages],
  );

  useEffect(() => {
    let active = true;

    const restoreArchive = async () => {
      try {
        const file = await readSavedArchive();
        if (!file) return;

        const savedView = await readSavedArchiveView();
        const opened = await openInstagramArchive(file, (done, total) => {
          if (active) setProgress({ done, total });
        });
        if (!active) {
          await opened.close();
          return;
        }

        const savedThread = savedView?.threadId;
        const restoredThreadId =
          savedThread !== undefined && savedThread !== null && opened.threads.some((item) => item.id === savedThread)
          ? savedThread
          : (opened.threads[0]?.id ?? null);
        setArchive(opened);
        setThreadId(restoredThreadId);
        setTab(savedView?.tab ?? "analytics");
      } catch (err) {
        if (active) {
          toast.error(`Could not restore your saved archive: ${err instanceof Error ? err.message : String(err)}`);
        }
      } finally {
        if (active) {
          setProgress(null);
          setRestoring(false);
        }
      }
    };

    void restoreArchive();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!archive || !threadId) return;
    let active = true;
    archive
      .loadThread(threadId)
      .then((result) => {
        if (active) setLoaded({ id: threadId, messages: result });
      })
      .catch(() => {
        if (active) toast.error("Could not read this conversation from the zip.");
      });
    return () => {
      active = false;
    };
  }, [archive, threadId]);

  useEffect(() => {
    return () => {
      archive?.close().catch(() => undefined);
    };
  }, [archive]);

  useEffect(() => {
    if (!menuOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [menuOpen]);

  const openFile = async (file: File) => {
    setOpening(true);
    setProgress(null);
    try {
      const opened = await openInstagramArchive(file, (done, total) => setProgress({ done, total }));
      const initialThreadId = opened.threads[0]?.id ?? null;
      try {
        await saveArchive(file, { threadId: initialThreadId, tab: "analytics" });
      } catch (err) {
        toast.error(
          `Archive opened, but could not be saved for next time: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
      setArchive(opened);
      setThreadId(initialThreadId);
      setTab("analytics");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not read this zip file.");
    } finally {
      setOpening(false);
    }
  };

  const reset = () => {
    setArchive(null);
    setThreadId(null);
    setLoaded(null);
    setTab("analytics");
    clearSavedArchive().catch((err: unknown) => {
      toast.error(`Could not remove the saved archive: ${err instanceof Error ? err.message : String(err)}`);
    });
  };

  if (!archive) {
    return (
      <div className="flex min-h-[100dvh] flex-col overflow-x-hidden">
        <nav className="sticky top-0 z-20 shrink-0 border-b border-border/70 bg-background/80 backdrop-blur-xl">
          <div className="relative mx-auto flex h-16 w-full max-w-7xl items-center justify-center px-4">
            <span className="font-display text-xl font-extrabold tracking-[-0.7px] sm:text-2xl">
              <span className="bg-gradient-to-r from-[#f58529] via-[#dd2a7b] to-[#8134af] bg-clip-text text-transparent">
                instalyze
              </span>
            </span>
            <div className="absolute right-4">
              <ThemeToggle />
            </div>
          </div>
        </nav>
        <UploadScreen
          loading={opening || restoring}
          loadingMessage={restoring ? "Restoring your saved archive" : undefined}
          progress={progress}
          onFile={openFile}
        />
      </div>
    );
  }

  const conversationPicker = (
    <ConversationPicker
      threads={archive.threads}
      value={thread}
      onChange={(id) => {
        setThreadId(id);
        setMenuOpen(false);
        saveArchiveView({ threadId: id, tab }).catch((err: unknown) => {
          toast.error(`Could not save your selected conversation: ${err instanceof Error ? err.message : String(err)}`);
        });
      }}
    />
  );

  const tabsControl = (
    <div className="flex flex-col gap-1">
      {TABS.map(({ key, label, icon: Icon }) => (
        <button
          key={key}
          type="button"
          onClick={() => {
            setTab(key);
            setMenuOpen(false);
            saveArchiveView({ threadId, tab: key }).catch((err: unknown) => {
              toast.error(`Could not save your selected view: ${err instanceof Error ? err.message : String(err)}`);
            });
          }}
          className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium cursor-pointer transition-colors ${
            tab === key ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
          }`}
        >
          <Icon className={`h-4 w-4 ${tab === key ? "text-[#dd2a7b]" : ""}`} />
          <span className="flex-1">{label}</span>
          {tab === key && <span className="h-1.5 w-1.5 rounded-full bg-[#dd2a7b]" />}
        </button>
      ))}
    </div>
  );

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden">
      <nav className="relative z-10 flex h-16 shrink-0 items-center justify-center border-b border-border/70 bg-background/80 backdrop-blur-xl">
        <button
          type="button"
          aria-label="Open navigation"
          aria-expanded={menuOpen}
          aria-controls="app-sidebar"
          onClick={() => setMenuOpen(true)}
          className="absolute left-4 grid h-10 w-10 place-items-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <Menu className="h-5 w-5" />
        </button>
        <span className="font-display text-xl font-extrabold tracking-[-0.7px] sm:text-2xl">
          <span className="bg-gradient-to-r from-[#f58529] via-[#dd2a7b] to-[#8134af] bg-clip-text text-transparent">
            instalyze
          </span>
        </span>
      </nav>

      {menuOpen && (
        <div className="fixed inset-0 z-50">
          <button
            type="button"
            aria-label="Close navigation"
            onClick={() => setMenuOpen(false)}
            className="absolute inset-0 h-full w-full cursor-default bg-black/40 backdrop-blur-[2px]"
          />
          <aside
            id="app-sidebar"
            role="dialog"
            aria-modal="true"
            aria-labelledby="sidebar-title"
            className="absolute inset-y-0 left-0 flex w-[min(88vw,360px)] flex-col border-r border-border bg-background shadow-2xl"
          >
            <div className="flex h-16 shrink-0 items-center justify-between border-b border-border px-5">
              <div className="flex items-center gap-3">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-[#f58529] via-[#dd2a7b] to-[#8134af] text-white">
                  <Sparkles className="h-4 w-4" />
                </span>
                <h2 id="sidebar-title" className="font-display text-lg font-bold">Navigation</h2>
              </div>
              <button
                type="button"
                aria-label="Close navigation"
                onClick={() => setMenuOpen(false)}
                className="grid h-9 w-9 place-items-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              <section>
                <h3 className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Conversation
                </h3>
                {conversationPicker}
              </section>
              <section className="mt-8">
                <h3 className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Explore
                </h3>
                {tabsControl}
              </section>
            </div>

            <div className="shrink-0 space-y-3 border-t border-border p-4">
              <div className="flex items-center justify-between rounded-xl bg-muted/60 px-3 py-2">
                <span className="text-sm font-medium">Appearance</span>
                <ThemeToggle />
              </div>
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  reset();
                }}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <Upload className="h-4 w-4" />
                New ZIP
              </button>
            </div>
          </aside>
        </div>
      )}

      {!thread || !messages || !analytics ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {tab === "analytics" && (
            <div className="flex-1 overflow-y-auto">
              <AnalyticsView key={thread.id} data={analytics} />
            </div>
          )}
          {tab === "chat" && (
            <div className="flex-1 min-h-0 w-full">
              <ChatView
                key={thread.id}
                thread={thread}
                messages={messages}
                owner={archive.owner}
                resolveMedia={archive.mediaUrl}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
