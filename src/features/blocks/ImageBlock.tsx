"use client";

import { Link2 } from "lucide-react";
import { useCanvasStore } from "@/stores/canvasStore";
import { useUIStore } from "@/stores/uiStore";
import type { Block } from "@/types";

interface ImageBlockProps {
  block: Block;
  isEditing: boolean;
}

export function ImageBlock({ block, isEditing }: ImageBlockProps) {
  const updateBlock = useCanvasStore((s) => s.updateBlock);
  const { isDarkMode } = useUIStore();

  if (isEditing) {
    const inputClass = `w-full p-2 text-xs rounded outline-none border ${
      isDarkMode
        ? "bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
        : "bg-slate-100 border-slate-300 text-slate-900 placeholder:text-slate-400"
    }`;
    return (
      <div className="flex flex-col gap-1.5">
        <input
          autoFocus
          className={inputClass}
          value={block.content}
          onChange={(e) => updateBlock(block.id, { content: e.target.value })}
          placeholder="Image URL..."
        />
        <div className="flex items-center gap-1.5">
          <Link2 size={12} className={isDarkMode ? "text-zinc-500" : "text-slate-400"} />
          <input
            className={inputClass}
            value={block.linkUrl ?? ""}
            onChange={(e) => updateBlock(block.id, { linkUrl: e.target.value || undefined })}
            placeholder="Click target URL (optional)..."
          />
        </div>
      </div>
    );
  }

  const img = (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      src={block.content}
      alt={block.title}
      className={`w-full h-auto object-contain ${block.linkUrl ? "" : "pointer-events-none"}`}
      onError={(e) => {
        (e.target as HTMLImageElement).src =
          "https://placehold.co/600x400?text=Error+loading";
      }}
    />
  );

  if (block.linkUrl) {
    return (
      <div className="relative overflow-hidden rounded-lg group/img">
        <a
          href={block.linkUrl}
          target="_blank"
          rel="noopener noreferrer"
          onMouseDown={(e) => e.stopPropagation()}
        >
          {img}
        </a>
        <div className="absolute bottom-1.5 right-1.5 opacity-0 group-hover/img:opacity-100 transition-opacity">
          <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] ${
            isDarkMode ? "bg-zinc-800/80 text-zinc-400" : "bg-white/80 text-slate-500"
          }`}>
            <Link2 size={10} />
            {(() => { try { return new URL(block.linkUrl!).hostname; } catch { return block.linkUrl; } })()}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-lg">
      {img}
    </div>
  );
}
