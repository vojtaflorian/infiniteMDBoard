"use client";

import { useState, useEffect } from "react";
import { useCanvasStore } from "@/stores/canvasStore";
import { useUIStore } from "@/stores/uiStore";
import type { Block } from "@/types";

interface OGData {
  title: string;
  description: string;
  image: string | null;
  hostname: string;
  faviconUrl: string;
}

function ensureProtocol(url: string): string {
  if (!url.match(/^https?:\/\//i)) return `https://${url}`;
  return url;
}

function toEmbedUrl(url: string): string {
  const fullUrl = ensureProtocol(url);
  try {
    const u = new URL(fullUrl);
    // YouTube
    if (
      u.hostname === "www.youtube.com" ||
      u.hostname === "youtube.com" ||
      u.hostname === "youtu.be"
    ) {
      let videoId: string | null = null;
      if (u.hostname === "youtu.be") {
        videoId = u.pathname.slice(1);
      } else {
        videoId = u.searchParams.get("v");
      }
      if (videoId) return `https://www.youtube.com/embed/${videoId}`;
    }
    // Vimeo
    if (u.hostname.includes("vimeo.com")) {
      const match = u.pathname.match(/\/(\d+)/);
      if (match) return `https://player.vimeo.com/video/${match[1]}`;
    }
    return fullUrl;
  } catch {
    return fullUrl;
  }
}

interface LinkBlockProps {
  block: Block;
  isEditing: boolean;
}

export function LinkBlock({ block, isEditing }: LinkBlockProps) {
  const updateBlock = useCanvasStore((s) => s.updateBlock);
  const { isDarkMode } = useUIStore();
  const [og, setOg] = useState<OGData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!block.content || isEditing) return;
    let cancelled = false;
    setLoading(true);
    setError(false);
    fetch(`/api/og?url=${encodeURIComponent(ensureProtocol(block.content))}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (data.error) {
          setError(true);
          return;
        }
        setOg(data);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [block.content, isEditing]);

  if (isEditing) {
    return (
      <input
        autoFocus
        className={`w-full p-2 text-xs rounded outline-none border ${
          isDarkMode
            ? "bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
            : "bg-slate-100 border-slate-300 text-slate-900 placeholder:text-slate-400"
        }`}
        value={block.content}
        onChange={(e) => updateBlock(block.id, { content: e.target.value })}
        placeholder="https://..."
        type="url"
      />
    );
  }

  if (!block.content) {
    return (
      <p
        className={`text-xs ${isDarkMode ? "text-zinc-500" : "text-slate-400"}`}
      >
        Click to enter URL
      </p>
    );
  }

  if (loading) {
    return (
      <div
        className={`text-xs animate-pulse ${isDarkMode ? "text-zinc-500" : "text-slate-400"}`}
      >
        Loading preview...
      </div>
    );
  }

  if (block.embed) {
    const embedUrl = toEmbedUrl(block.content);
    return (
      <div className="relative">
        <iframe
          src={embedUrl}
          className="w-full rounded-lg border-0"
          style={{ height: block.height > 0 ? block.height - 32 : 300 }}
          sandbox="allow-scripts allow-same-origin allow-popups"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope"
          title={block.title}
        />
        <a
          href={ensureProtocol(block.content)}
          target="_blank"
          rel="noopener noreferrer"
          className={`block text-center text-xs mt-1 underline ${isDarkMode ? "text-zinc-500 hover:text-zinc-300" : "text-slate-400 hover:text-slate-600"}`}
          onMouseDown={(e) => e.stopPropagation()}
        >
          Open in new tab
        </a>
      </div>
    );
  }

  if (error || !og) {
    return (
      <a
        href={ensureProtocol(block.content)}
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs text-blue-400 underline break-all"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {block.content}
      </a>
    );
  }

  return (
    <a
      href={ensureProtocol(block.content)}
      target="_blank"
      rel="noopener noreferrer"
      className="block no-underline"
      onMouseDown={(e) => e.stopPropagation()}
    >
      {og.image && (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={og.image}
          alt=""
          className="w-full mb-2 rounded-lg object-cover max-h-32"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = "none";
          }}
        />
      )}
      <div className="flex items-start gap-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={og.faviconUrl}
          alt=""
          width={16}
          height={16}
          className="mt-0.5 shrink-0"
        />
        <div className="min-w-0">
          <p
            className={`text-sm font-medium leading-tight truncate ${isDarkMode ? "text-zinc-100" : "text-slate-800"}`}
          >
            {og.title}
          </p>
          {og.description && (
            <p
              className={`text-xs mt-1 line-clamp-2 ${isDarkMode ? "text-zinc-400" : "text-slate-500"}`}
            >
              {og.description}
            </p>
          )}
          <p
            className={`text-xs mt-1 ${isDarkMode ? "text-zinc-600" : "text-slate-400"}`}
          >
            {og.hostname}
          </p>
        </div>
      </div>
    </a>
  );
}
