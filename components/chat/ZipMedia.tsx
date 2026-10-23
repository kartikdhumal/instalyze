"use client";

import { useEffect, useState } from "react";
import { FileText, ImageOff } from "lucide-react";
import type { MediaItem } from "@/lib/instagram/types";

interface ZipMediaProps {
  readonly item: MediaItem;
  readonly resolve: (uri: string) => Promise<string | null>;
}

type MediaState = { status: "loading" } | { status: "missing" } | { status: "ready"; url: string };

export function ZipMedia({ item, resolve }: ZipMediaProps) {
  const [state, setState] = useState<MediaState>({ status: "loading" });

  useEffect(() => {
    let active = true;
    resolve(item.uri)
      .then((url) => {
        if (active) setState(url ? { status: "ready", url } : { status: "missing" });
      })
      .catch(() => {
        if (active) setState({ status: "missing" });
      });
    return () => {
      active = false;
    };
  }, [item.uri, resolve]);

  if (state.status === "loading") {
    return <div className="skeleton-wave w-[220px] h-[220px] rounded-2xl" />;
  }

  if (state.status === "missing") {
    return (
      <div className="flex items-center gap-2 rounded-2xl border border-border px-3 py-2 text-xs text-muted-foreground">
        <ImageOff className="w-4 h-4" />
        {item.type === "audio" ? "Voice message" : "Media"} not included in the export
      </div>
    );
  }

  switch (item.type) {
    case "video":
      return <video src={state.url} controls preload="metadata" className="max-w-[260px] max-h-[360px] rounded-2xl bg-black" />;
    case "audio":
      return <audio src={state.url} controls preload="metadata" className="max-w-[260px]" />;
    case "file":
      return (
        <a
          href={state.url}
          download
          className="flex items-center gap-2 rounded-2xl border border-border px-3 py-2 text-xs cursor-pointer hover:bg-muted"
        >
          <FileText className="w-4 h-4" />
          {item.uri.split("/").pop()}
        </a>
      );
    case "sticker":
      return <img src={state.url} alt="Sticker" loading="lazy" className="w-28 h-28 object-contain" />;
    default:
      return (
        <a href={state.url} target="_blank" rel="noopener noreferrer" className="cursor-zoom-in">
          <img
            src={state.url}
            alt={item.type === "gif" ? "GIF" : "Photo"}
            loading="lazy"
            className="max-w-[240px] max-h-[320px] rounded-2xl object-cover"
          />
        </a>
      );
  }
}
