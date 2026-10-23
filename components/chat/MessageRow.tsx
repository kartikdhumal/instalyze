"use client";

import { Fragment, type ReactNode } from "react";
import { InitialsAvatar } from "@/components/InitialsAvatar";
import type { ChatMessage } from "@/lib/instagram/types";
import { ZipMedia } from "./ZipMedia";

export interface ChatRow {
  message: ChatMessage;
  own: boolean;
  firstInGroup: boolean;
  lastInGroup: boolean;
  timestamp: string | null;
}

interface MessageRowProps {
  readonly row: ChatRow;
  readonly isGroup: boolean;
  readonly query: string;
  readonly active: boolean;
  readonly resolveMedia: (uri: string) => Promise<string | null>;
}

const EMOJI_ONLY = /^(?:\p{Extended_Pictographic}|\p{Emoji_Component}|‍|️|\s){1,24}$/u;

function escapeRegExp(value: string): string {
  return value.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);
}

export function highlight(text: string, query: string): ReactNode {
  if (!query) return text;
  const parts = text.split(new RegExp(`(${escapeRegExp(query)})`, "gi"));
  return parts.map((part, index) =>
    index % 2 === 1 ? (
      <mark key={`${index}-${part}`} className="ig-match">
        {part}
      </mark>
    ) : (
      <Fragment key={`${index}-${part}`}>{part}</Fragment>
    ),
  );
}

const TIGHT_CORNERS = {
  own: { top: "rounded-tr-md", bottom: "rounded-br-md" },
  other: { top: "rounded-tl-md", bottom: "rounded-bl-md" },
};

function bubbleCorners(own: boolean, first: boolean, last: boolean): string {
  const corners = own ? TIGHT_CORNERS.own : TIGHT_CORNERS.other;
  return [first ? "" : corners.top, last ? "" : corners.bottom].join(" ");
}

function SharedCard({ message, query }: Readonly<{ message: ChatMessage; query: string }>) {
  const share = message.share;
  if (!share) return null;
  let domain = "";
  try {
    domain = share.link ? new URL(share.link).hostname.replace(/^www\./, "") : "";
  } catch {
    domain = share.link;
  }
  const body = (
    <div className="w-[240px] rounded-2xl border border-border bg-card overflow-hidden text-left">
      {share.owner && <div className="px-3 pt-2.5 text-xs font-semibold">@{share.owner}</div>}
      {share.text && <p className="px-3 pt-1 text-sm line-clamp-3 whitespace-pre-wrap">{highlight(share.text, query)}</p>}
      {domain && <div className="px-3 py-2 text-xs text-muted-foreground truncate">{domain}</div>}
    </div>
  );
  if (!share.link) return body;
  return (
    <a href={share.link} target="_blank" rel="noopener noreferrer" className="cursor-pointer hover:opacity-90">
      {body}
    </a>
  );
}

export function MessageRow({ row, isGroup, query, active, resolveMedia }: MessageRowProps) {
  const { message, own, firstInGroup, lastInGroup, timestamp } = row;

  const header = timestamp && (
    <div className="text-center text-[11px] font-medium text-muted-foreground pt-5 pb-3">{timestamp}</div>
  );

  if (message.kind === "system") {
    return (
      <div className="px-4">
        {header}
        <div className="text-center text-xs text-muted-foreground py-1.5">
          {message.sender} · {highlight(message.text, query)}
        </div>
      </div>
    );
  }

  const emojiOnly = message.text !== "" && EMOJI_ONLY.test(message.text);
  const corners = bubbleCorners(own, firstInGroup, lastInGroup);
  const ring = active ? "ring-2 ring-yellow-400 ring-offset-2 ring-offset-background" : "";
  const reactionText = message.reactions.map((reaction) => reaction.emoji).join("");
  const reactionTitle = message.reactions.map((reaction) => `${reaction.actor} ${reaction.emoji}`).join("\n");

  return (
    <div className="px-4">
      {header}
      <div className={`flex items-end gap-2 ${own ? "justify-end" : "justify-start"} ${lastInGroup ? "pb-2" : "pb-0.5"}`}>
        {!own && (
          <div className="w-7 shrink-0">
            {lastInGroup && <InitialsAvatar name={message.sender} className="w-7 h-7 text-[10px]" />}
          </div>
        )}
        <div className={`flex flex-col max-w-[70%] ${own ? "items-end" : "items-start"}`}>
          {isGroup && !own && firstInGroup && (
            <span className="text-[11px] text-muted-foreground px-3 pb-1">{message.sender}</span>
          )}
          {message.edited && <span className="text-[11px] text-muted-foreground px-3 pb-0.5">Edited</span>}
          <div className={`flex flex-col gap-1 ${own ? "items-end" : "items-start"}`} title={message.time}>
            {message.media.map((item) => (
              <ZipMedia key={item.uri} item={item} resolve={resolveMedia} />
            ))}
            <SharedCard message={message} query={query} />
            {message.attachment && (
              <div className="rounded-[22px] border border-border px-3.5 py-2 text-sm text-muted-foreground italic">
                Attachment unavailable
              </div>
            )}
            {message.text && emojiOnly && <span className={`text-4xl leading-tight rounded-xl ${ring}`}>{message.text}</span>}
            {message.text && !emojiOnly && (
              <div
                className={`rounded-[22px] px-3.5 py-2 text-[15px] leading-snug whitespace-pre-wrap break-words ${corners} ${own ? "ig-own-bubble" : "ig-other-bubble"} ${ring}`}
              >
                {highlight(message.text, query)}
              </div>
            )}
          </div>
          {reactionText && (
            <span
              title={reactionTitle}
              className="-mt-1.5 mx-2 relative rounded-full border-2 border-background bg-muted px-1.5 text-xs leading-5"
            >
              {reactionText}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
