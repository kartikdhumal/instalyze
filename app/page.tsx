"use client";

import { useEffect, useMemo, useState } from "react";
import { BarChart3, Loader2, MessageCircle, Upload } from "lucide-react";
import { toast } from "sonner";
import { AnalyticsView } from "@/components/AnalyticsView";
import { ChatView } from "@/components/chat/ChatView";
import { ConversationPicker } from "@/components/ConversationPicker";
import { ThemeToggle } from "@/components/ThemeToggle";
import { UploadScreen } from "@/components/UploadScreen";
import { computeAnalytics } from "@/lib/analytics";
import { openInstagramArchive, type InstagramArchive } from "@/lib/instagram/archive";
import type { ChatMessage } from "@/lib/instagram/types";

type Tab = "analytics" | "chat";

const TABS: { key: Tab; label: string; icon: typeof BarChart3 }[] = [
  { key: "analytics", label: "Analytics", icon: BarChart3 },
  { key: "chat", label: "Messages", icon: MessageCircle },
];

export default function HomePage() {
  const [archive, setArchive] = useState<InstagramArchive | null>(null);
  const [opening, setOpening] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [loaded, setLoaded] = useState<{ id: string; messages: ChatMessage[] } | null>(null);
  const [tab, setTab] = useState<Tab>("analytics");

  const thread = archive?.threads.find((t) => t.id === threadId) ?? null;
  const messages = loaded?.id === threadId ? loaded.messages : null;

  const analytics = useMemo(
    () => (thread && messages ? computeAnalytics(messages, thread.title) : null),
    [thread, messages],
  );

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

  const openFile = async (file: File) => {
    setOpening(true);
    setProgress(null);
    try {
      const opened = await openInstagramArchive(file, (done, total) => setProgress({ done, total }));
      setArchive(opened);
      setThreadId(opened.threads[0]?.id ?? null);
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
  };

  if (!archive) {
    return (
      <>
        <div className="flex justify-end px-4 pt-4">
          <ThemeToggle />
        </div>
        <UploadScreen loading={opening} progress={progress} onFile={openFile} />
      </>
    );
  }

  return (
    <div className="flex flex-col h-[100dvh]">
      <nav className="shrink-0 border-b border-border bg-nav-bg/70 backdrop-blur-md">
        <div className="max-w-screen-2xl mx-auto px-4 py-3 flex flex-wrap items-center gap-3">
          <span className="font-display text-2xl font-extrabold tracking-[-0.5px] bg-gradient-to-r from-[#f58529] via-[#dd2a7b] to-[#8134af] bg-clip-text text-transparent">
            Instalyze
          </span>

          <ConversationPicker threads={archive.threads} value={thread} onChange={setThreadId} />

          <div className="flex items-center gap-1 bg-muted rounded-xl p-1">
            {TABS.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                type="button"
                onClick={() => setTab(key)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium cursor-pointer transition-colors ${
                  tab === key ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>

          <div className="ml-auto flex items-center gap-1">
            <button
              type="button"
              onClick={reset}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-muted-foreground cursor-pointer hover:text-foreground hover:bg-muted"
            >
              <Upload className="w-4 h-4" />
              New zip
            </button>
            <ThemeToggle />
          </div>
        </div>
      </nav>

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
            <div className="flex-1 min-h-0 w-full max-w-3xl mx-auto p-4">
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
