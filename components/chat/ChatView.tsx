"use client";

import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { Virtuoso, type VirtuosoHandle } from "react-virtuoso";
import { ChevronDown, ChevronUp, Search, X } from "lucide-react";
import { InitialsAvatar } from "@/components/InitialsAvatar";
import { formatChatDate } from "@/lib/formatDate";
import type { ChatMessage, ThreadSummary } from "@/lib/instagram/types";
import { MessageRow, type ChatRow } from "./MessageRow";

interface ChatViewProps {
  readonly thread: ThreadSummary;
  readonly messages: ChatMessage[];
  readonly owner: string;
  readonly resolveMedia: (uri: string) => Promise<string | null>;
}

const TIMESTAMP_GAP_MS = 60 * 60 * 1000;

function ChatFooter() {
  return <div className="h-4" />;
}

const VIRTUOSO_COMPONENTS = { Footer: ChatFooter };

function buildRows(messages: ChatMessage[], owner: string): ChatRow[] {
  return messages.map((message, index) => {
    const previous = messages[index - 1];
    const next = messages[index + 1];
    const timestamp =
      !previous || message.ts - previous.ts > TIMESTAMP_GAP_MS ? `${formatChatDate(message.date)}, ${message.time}` : null;
    const nextStartsBlock = !next || next.ts - message.ts > TIMESTAMP_GAP_MS;
    return {
      message,
      own: message.sender === owner,
      timestamp,
      firstInGroup: timestamp !== null || previous?.sender !== message.sender || previous?.kind !== "message",
      lastInGroup: nextStartsBlock || next?.sender !== message.sender || next?.kind !== "message",
    };
  });
}

function matchesQuery(message: ChatMessage, needle: string): boolean {
  return (
    message.text.toLowerCase().includes(needle) || (message.share?.text.toLowerCase().includes(needle) ?? false)
  );
}

export function ChatView({ thread, messages, owner, resolveMedia }: ChatViewProps) {
  const virtuosoRef = useRef<VirtuosoHandle>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState({ query: "", index: 0 });
  const deferredQuery = useDeferredValue(query.trim());

  const rows = useMemo(() => buildRows(messages, owner), [messages, owner]);

  const matches = useMemo(() => {
    if (!deferredQuery) return [];
    const needle = deferredQuery.toLowerCase();
    return rows.flatMap((row, index) => (matchesQuery(row.message, needle) ? [index] : []));
  }, [rows, deferredQuery]);

  const matchIndex = cursor.query === deferredQuery ? cursor.index : matches.length - 1;
  const activeRow = matches[matchIndex] ?? -1;

  useEffect(() => {
    if (activeRow >= 0) virtuosoRef.current?.scrollToIndex({ index: activeRow, align: "center" });
  }, [activeRow]);

  const step = (direction: -1 | 1) => {
    if (matches.length === 0) return;
    const next = (matchIndex + direction + matches.length) % matches.length;
    setCursor({ query: deferredQuery, index: next });
  };

  const closeSearch = () => {
    setSearchOpen(false);
    setQuery("");
  };

  const subtitle = thread.isGroup
    ? `${thread.participants.length} members · ${messages.length.toLocaleString()} messages`
    : `${messages.length.toLocaleString()} messages`;

  let matchLabel = "";
  if (deferredQuery) matchLabel = matches.length === 0 ? "No results" : `${matchIndex + 1} of ${matches.length}`;

  return (
    <div className="flex flex-col h-full min-h-0 bg-background border border-border rounded-xl overflow-hidden">
      <div className="flex items-center gap-3 px-4 h-16 border-b border-border shrink-0">
        <InitialsAvatar name={thread.title} isGroup={thread.isGroup} className="w-10 h-10 text-sm" />
        <div className="min-w-0 flex-1">
          <div className="font-semibold truncate">{thread.title}</div>
          <div className="text-xs text-muted-foreground truncate">{subtitle}</div>
        </div>
        {!searchOpen && (
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="p-2 rounded-full cursor-pointer hover:bg-muted"
            aria-label="Search messages"
          >
            <Search className="w-5 h-5" />
          </button>
        )}
      </div>

      {searchOpen && (
        <div className="flex items-center gap-2 px-4 py-2 border-b border-border shrink-0">
          <div className="flex items-center gap-2 flex-1 rounded-lg bg-muted px-3 h-9">
            <Search className="w-4 h-4 text-muted-foreground shrink-0" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") step(e.shiftKey ? 1 : -1);
                if (e.key === "Escape") closeSearch();
              }}
              placeholder="Search in conversation"
              className="flex-1 bg-transparent text-sm outline-none min-w-0"
            />
            <span className="text-xs text-muted-foreground tabular-nums whitespace-nowrap">{matchLabel}</span>
          </div>
          <button
            type="button"
            onClick={() => step(-1)}
            disabled={matches.length === 0}
            className="p-1.5 rounded-full cursor-pointer hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Older match"
          >
            <ChevronUp className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={() => step(1)}
            disabled={matches.length === 0}
            className="p-1.5 rounded-full cursor-pointer hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Newer match"
          >
            <ChevronDown className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={closeSearch}
            className="p-1.5 rounded-full cursor-pointer hover:bg-muted"
            aria-label="Close search"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      <div className="flex-1 min-h-0">
        <Virtuoso
          ref={virtuosoRef}
          data={rows}
          initialTopMostItemIndex={Math.max(rows.length - 1, 0)}
          computeItemKey={(_, row) => row.message.id}
          increaseViewportBy={600}
          itemContent={(index, row) => (
            <MessageRow
              row={row}
              isGroup={thread.isGroup}
              query={deferredQuery}
              active={index === activeRow}
              resolveMedia={resolveMedia}
            />
          )}
          components={VIRTUOSO_COMPONENTS}
          style={{ height: "100%" }}
        />
      </div>
    </div>
  );
}
