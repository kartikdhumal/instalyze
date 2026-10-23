import { BlobReader, BlobWriter, TextWriter, ZipReader, configure, type Entry, type FileEntry } from "@zip.js/zip.js";
import { normalizeMessages, repairMojibake, type RawMessage, type RawThread } from "./normalize";
import type { ChatMessage, ThreadSummary } from "./types";

configure({ useWebWorkers: false });

const THREAD_FILE = /(?:^|\/)messages\/((?:inbox|message_requests)\/[^/]+)\/message_(\d+)\.json$/;
const REQUEST_PREFIX = "message_requests/";
const READ_BATCH = 8;

const MIME_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
  mp4: "video/mp4",
  mov: "video/quicktime",
  m4a: "audio/mp4",
  aac: "audio/aac",
  mp3: "audio/mpeg",
  wav: "audio/wav",
};

export class NotInstagramExportError extends Error {
  constructor() {
    super("No Instagram messages were found in this zip. Request the export in JSON format and include Messages.");
  }
}

export interface InstagramArchive {
  owner: string;
  threads: ThreadSummary[];
  loadThread: (id: string) => Promise<ChatMessage[]>;
  mediaUrl: (uri: string) => Promise<string | null>;
  close: () => Promise<void>;
}

function isFile(entry: Entry): entry is FileEntry {
  return !entry.directory;
}

function messagesPath(path: string): string {
  const index = path.indexOf("messages/");
  return index === -1 ? path : path.slice(index);
}

async function readJson<T>(entry: FileEntry): Promise<T> {
  return JSON.parse(await entry.getData(new TextWriter())) as T;
}

function detectOwner(threads: RawThread[]): string {
  const seen = new Map<string, { threads: number; last: number }>();
  for (const thread of threads) {
    const names = (thread.participants ?? []).map((p) => repairMojibake(p.name)).filter(Boolean);
    names.forEach((name, index) => {
      const score = seen.get(name) ?? { threads: 0, last: 0 };
      score.threads += 1;
      if (index === names.length - 1) score.last += 1;
      seen.set(name, score);
    });
  }
  const ranked = [...seen.entries()].sort((a, b) => b[1].threads - a[1].threads || b[1].last - a[1].last);
  return ranked[0]?.[0] ?? "";
}

interface ThreadHead {
  first: RawThread;
  messageCount: number;
}

async function readHead(parts: FileEntry[]): Promise<ThreadHead> {
  const first = await readJson<RawThread>(parts[0]);
  const firstCount = first.messages?.length ?? 0;
  if (parts.length === 1) return { first, messageCount: firstCount };
  const last = await readJson<RawThread>(parts[parts.length - 1]);
  return { first, messageCount: firstCount * (parts.length - 1) + (last.messages?.length ?? 0) };
}

function summarize(id: string, { first: raw, messageCount }: ThreadHead, owner: string): ThreadSummary {
  const participants = (raw.participants ?? []).map((p) => repairMojibake(p.name)).filter(Boolean);
  const others = participants.filter((name) => name !== owner);
  const lastTs = (raw.messages ?? []).reduce((max, m) => Math.max(max, m.timestamp_ms ?? 0), 0);
  return {
    id,
    title: repairMojibake(raw.title) || others.join(", ") || id.split("/")[1],
    participants,
    isGroup: participants.length > 2,
    isRequest: id.startsWith(REQUEST_PREFIX),
    lastTs,
    messageCount,
  };
}

export async function openInstagramArchive(
  file: File,
  onProgress: (done: number, total: number) => void,
): Promise<InstagramArchive> {
  const reader = new ZipReader(new BlobReader(file));
  const entries = (await reader.getEntries()).filter(isFile);

  const byPath = new Map<string, FileEntry>();
  const numberedParts = new Map<string, { part: number; entry: FileEntry }[]>();
  for (const entry of entries) {
    byPath.set(messagesPath(entry.filename), entry);
    const match = THREAD_FILE.exec(entry.filename);
    if (!match) continue;
    const parts = numberedParts.get(match[1]) ?? [];
    parts.push({ part: Number(match[2]), entry });
    numberedParts.set(match[1], parts);
  }

  const partsByThread = new Map<string, FileEntry[]>(
    [...numberedParts].map(([id, parts]) => [id, parts.sort((a, b) => a.part - b.part).map((p) => p.entry)]),
  );

  if (partsByThread.size === 0) {
    await reader.close();
    throw new NotInstagramExportError();
  }

  const ids = [...partsByThread.keys()];
  const heads: ThreadHead[] = [];
  for (let start = 0; start < ids.length; start += READ_BATCH) {
    const batch = ids.slice(start, start + READ_BATCH).map((id) => readHead(partsByThread.get(id) ?? []));
    heads.push(...(await Promise.all(batch)));
    onProgress(Math.min(start + READ_BATCH, ids.length), ids.length);
  }

  const owner = detectOwner(heads.map((head) => head.first));
  const threads = ids
    .map((id, index) => summarize(id, heads[index], owner))
    .sort((a, b) => b.messageCount - a.messageCount || b.lastTs - a.lastTs);

  const mediaCache = new Map<string, string>();

  return {
    owner,
    threads,
    loadThread: async (id) => {
      const parts = partsByThread.get(id) ?? [];
      const raws = await Promise.all(parts.map((entry) => readJson<RawThread>(entry)));
      return normalizeMessages(raws.flatMap((raw): RawMessage[] => raw.messages ?? []));
    },
    mediaUrl: async (uri) => {
      const cached = mediaCache.get(uri);
      if (cached) return cached;
      const entry = byPath.get(messagesPath(uri));
      if (!entry) return null;
      const extension = uri.split(".").pop()?.toLowerCase() ?? "";
      const blob = await entry.getData(new BlobWriter(MIME_TYPES[extension] ?? "application/octet-stream"));
      const url = URL.createObjectURL(blob);
      mediaCache.set(uri, url);
      return url;
    },
    close: async () => {
      mediaCache.forEach((url) => URL.revokeObjectURL(url));
      mediaCache.clear();
      await reader.close();
    },
  };
}
