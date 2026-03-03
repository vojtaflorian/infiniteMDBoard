"use client";

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
    return (
      <input
        autoFocus
        className={`w-full p-2 text-xs rounded outline-none border ${
          isDarkMode
            ? "bg-zinc-800 border-zinc-700 text-white"
            : "bg-slate-100 border-slate-300 text-slate-900"
        }`}
        value={block.content}
        onChange={(e) => updateBlock(block.id, { content: e.target.value })}
        placeholder="Image URL..."
      />
    );
  }

  return (
    <div className="relative overflow-hidden rounded-lg">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={block.content}
        alt={block.title}
        className="w-full h-auto object-contain pointer-events-none"
        onError={(e) => {
          (e.target as HTMLImageElement).src =
            "https://placehold.co/600x400?text=Error+loading";
        }}
      />
    </div>
  );
}
