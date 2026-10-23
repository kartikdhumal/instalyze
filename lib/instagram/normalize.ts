import type { ChatMessage, MediaItem, MediaType, Reaction, SharedItem } from "./types";

interface RawUri {
  uri?: string;
}

export interface RawMessage {
  sender_name?: string;
  timestamp_ms?: number;
  content?: string;
  photos?: RawUri[];
  videos?: RawUri[];
  audio_files?: RawUri[];
  gifs?: RawUri[];
  files?: RawUri[];
  sticker?: RawUri;
  share?: { link?: string; share_text?: string; original_content_owner?: string };
  reactions?: { reaction?: string; actor?: string }[];
  call_duration?: number;
  is_unsent?: boolean;
}

export interface RawThread {
  title?: string;
  participants?: { name?: string }[];
  messages?: RawMessage[];
}

const decoder = new TextDecoder("utf-8", { fatal: true });

export function repairMojibake(value: string | undefined): string {
  if (!value) return "";
  if (!/[\u0080-ÿ]/.test(value)) return value;
  const bytes = new Uint8Array(value.length);
  for (let i = 0; i < value.length; i++) {
    const code = value.codePointAt(i) ?? 0;
    if (code > 0xff) return value;
    bytes[i] = code;
  }
  try {
    return decoder.decode(bytes);
  } catch {
    return value;
  }
}

const REACTION_NOTICE = /^(?:\S+ )?(reacted .+ to your message|liked a message)$/i;
const EDITED_SUFFIX = /\s*\(edited\)$/i;
const ATTACHMENT_NOTICE = /sent an attachment\.?$/i;
const UNSENT_NOTICE = /unsent a message\.?$/i;
const SYSTEM_NOTICES = [
  /\b(created|named) the group\b/i,
  /\bchanged the group (photo|name)\b/i,
  /\badded .+ to the group\b/i,
  /\bremoved .+ from the group\b/i,
  /\bleft the group\b/i,
  /\bstarted (a video chat|an audio call|a call)\b/i,
  /\b(video chat|audio call|call) ended\b/i,
  /\bmissed (a|an) (video chat|audio call|call)\b/i,
  /\bchanged the (chat )?theme\b/i,
  /\bset the quick reaction\b/i,
  /\bset (the|his|her|their|your) (own )?nickname\b/i,
  /\bpinned a message\b/i,
  /\bsent a private reply to a comment\b/i,
  /^this account can't receive your message\b/i,
  /\bnotified about this message because they're in quiet mode\.?$/i,
];

const pad = (value: number) => value.toString().padStart(2, "0");

function mediaOf(raw: RawMessage): MediaItem[] {
  const groups: [MediaType, RawUri[] | undefined][] = [
    ["photo", raw.photos],
    ["video", raw.videos],
    ["audio", raw.audio_files],
    ["gif", raw.gifs],
    ["file", raw.files],
    ["sticker", raw.sticker ? [raw.sticker] : undefined],
  ];
  return groups.flatMap(([type, items]) =>
    (items ?? []).filter((item) => item.uri).map((item) => ({ type, uri: item.uri as string })),
  );
}

function shareOf(raw: RawMessage): SharedItem | null {
  if (!raw.share) return null;
  const share = {
    link: raw.share.link ?? "",
    text: repairMojibake(raw.share.share_text),
    owner: repairMojibake(raw.share.original_content_owner),
  };
  return share.link || share.text ? share : null;
}

function reactionsOf(raw: RawMessage): Reaction[] {
  return (raw.reactions ?? []).map((reaction) => ({
    emoji: repairMojibake(reaction.reaction),
    actor: repairMojibake(reaction.actor),
  }));
}

function callLabel(seconds: number): string {
  if (seconds <= 0) return "Missed call";
  const minutes = Math.floor(seconds / 60);
  return minutes > 0 ? `Call ended, ${minutes}m ${seconds % 60}s` : `Call ended, ${seconds}s`;
}

function isSystemText(text: string): boolean {
  return SYSTEM_NOTICES.some((pattern) => pattern.test(text));
}

export function normalizeMessages(raws: RawMessage[]): ChatMessage[] {
  const sorted = raws
    .filter((raw) => typeof raw.timestamp_ms === "number" && !raw.is_unsent)
    .sort((a, b) => (a.timestamp_ms as number) - (b.timestamp_ms as number));

  const messages: ChatMessage[] = [];
  for (const raw of sorted) {
    const rawContent = repairMojibake(raw.content).trim();
    const edited = EDITED_SUFFIX.test(rawContent);
    const content = rawContent.replace(EDITED_SUFFIX, "");
    if (REACTION_NOTICE.test(content) || UNSENT_NOTICE.test(content)) continue;

    const media = mediaOf(raw);
    const share = shareOf(raw);
    const isCall = typeof raw.call_duration === "number";
    const attachment = ATTACHMENT_NOTICE.test(content);
    const shownContent = attachment ? "" : content;
    const text = isCall && !shownContent ? callLabel(raw.call_duration as number) : shownContent;
    if (!text && media.length === 0 && !share && !isCall && !attachment) continue;

    const ts = raw.timestamp_ms as number;
    const d = new Date(ts);
    messages.push({
      id: messages.length,
      sender: repairMojibake(raw.sender_name) || "Unknown",
      ts,
      date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
      time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
      text,
      kind: isCall || isSystemText(text) ? "system" : "message",
      media,
      share,
      attachment: attachment && !share && media.length === 0,
      edited,
      reactions: reactionsOf(raw),
    });
  }
  return messages;
}
