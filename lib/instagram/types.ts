export type MediaType = "photo" | "video" | "audio" | "gif" | "sticker" | "file";

export interface MediaItem {
  type: MediaType;
  uri: string;
}

export interface SharedItem {
  link: string;
  text: string;
  owner: string;
}

export interface Reaction {
  emoji: string;
  actor: string;
}

export interface ChatMessage {
  id: number;
  sender: string;
  ts: number;
  date: string;
  time: string;
  text: string;
  kind: "message" | "system";
  media: MediaItem[];
  share: SharedItem | null;
  attachment: boolean;
  edited: boolean;
  reactions: Reaction[];
}

export interface ThreadSummary {
  id: string;
  title: string;
  participants: string[];
  isGroup: boolean;
  isRequest: boolean;
  lastTs: number;
  messageCount: number;
}
