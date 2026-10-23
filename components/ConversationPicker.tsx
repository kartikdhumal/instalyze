"use client";

import { Combobox } from "@base-ui/react/combobox";
import { CheckIcon, ChevronDownIcon, Search } from "lucide-react";
import { InitialsAvatar } from "@/components/InitialsAvatar";
import type { ThreadSummary } from "@/lib/instagram/types";

interface ConversationPickerProps {
  readonly threads: ThreadSummary[];
  readonly value: ThreadSummary | null;
  readonly onChange: (id: string) => void;
}

const COUNT_FORMAT = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 });

function matchesThread(thread: ThreadSummary, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return (
    thread.title.toLowerCase().includes(needle) ||
    thread.participants.some((name) => name.toLowerCase().includes(needle))
  );
}

export function ConversationPicker({ threads, value, onChange }: ConversationPickerProps) {
  return (
    <Combobox.Root
      items={threads}
      value={value}
      onValueChange={(thread) => {
        if (thread) onChange(thread.id);
      }}
      itemToStringLabel={(thread) => thread.title}
      isItemEqualToValue={(a, b) => a.id === b.id}
      filter={matchesThread}
      autoHighlight
    >
      <Combobox.Trigger className="flex h-9 w-full sm:w-[300px] items-center justify-between gap-2 rounded-lg border border-input bg-transparent px-2.5 text-sm cursor-pointer outline-none focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30 dark:hover:bg-input/50">
        <span className="flex min-w-0 items-center gap-2">
          {value && <InitialsAvatar name={value.title} isGroup={value.isGroup} className="w-6 h-6 text-[9px] shrink-0" />}
          <span className="truncate">{value?.title ?? "Choose a conversation"}</span>
        </span>
        <ChevronDownIcon className="size-4 shrink-0 text-muted-foreground" />
      </Combobox.Trigger>

      <Combobox.Portal>
        <Combobox.Positioner sideOffset={4} align="start" className="isolate z-50">
          <Combobox.Popup className="w-(--anchor-width) min-w-[300px] max-h-[min(70vh,var(--available-height))] flex flex-col rounded-lg bg-popover text-popover-foreground shadow-md ring-1 ring-foreground/10 overflow-hidden">
            <div className="flex items-center gap-2 border-b border-border px-3 h-10 shrink-0">
              <Search className="size-4 shrink-0 text-muted-foreground" />
              <Combobox.Input
                placeholder={`Search ${threads.length.toLocaleString()} conversations`}
                className="flex-1 min-w-0 bg-transparent text-sm outline-none"
              />
            </div>
            <Combobox.Empty className="px-3 py-6 text-center text-sm text-muted-foreground empty:hidden">
              No conversations found
            </Combobox.Empty>
            <Combobox.List className="overflow-y-auto p-1 empty:hidden">
              {(thread: ThreadSummary) => (
                <Combobox.Item
                  key={thread.id}
                  value={thread}
                  className="relative flex items-center gap-2 rounded-md py-1.5 pl-1.5 pr-8 text-sm cursor-pointer select-none outline-none data-highlighted:bg-accent data-highlighted:text-accent-foreground"
                >
                  <InitialsAvatar name={thread.title} isGroup={thread.isGroup} className="w-6 h-6 text-[9px] shrink-0" />
                  <span className="truncate flex-1">{thread.title}</span>
                  {thread.isRequest && (
                    <span className="shrink-0 rounded-full bg-muted px-1.5 text-[10px] text-muted-foreground">Request</span>
                  )}
                  <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                    {COUNT_FORMAT.format(thread.messageCount)}
                  </span>
                  <Combobox.ItemIndicator className="absolute right-2 flex size-4 items-center justify-center">
                    <CheckIcon className="size-4" />
                  </Combobox.ItemIndicator>
                </Combobox.Item>
              )}
            </Combobox.List>
          </Combobox.Popup>
        </Combobox.Positioner>
      </Combobox.Portal>
    </Combobox.Root>
  );
}
