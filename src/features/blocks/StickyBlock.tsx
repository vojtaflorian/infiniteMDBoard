"use client";

import { useCanvasStore } from "@/stores/canvasStore";
import { useUIStore } from "@/stores/uiStore";
import { highlightText } from "@/lib/highlight";
import type { Block } from "@/types";

interface StickyBlockProps {
  block: Block;
  isEditing: boolean;
}

export function StickyBlock({ block, isEditing }: StickyBlockProps) {
  const updateBlock = useCanvasStore((s) => s.updateBlock);
  const searchQuery = useUIStore((s) => s.searchQuery);

  if (isEditing) {
    return (
      <textarea
        autoFocus
        className="w-full min-h-[60px] bg-transparent outline-none resize-none text-sm leading-relaxed text-slate-800 placeholder:text-slate-500/60"
        value={block.content}
        onChange={(e) => updateBlock(block.id, { content: e.target.value })}
        placeholder="Write a note..."
      />
    );
  }

  return (
    <p className="text-sm leading-relaxed whitespace-pre-wrap text-slate-800">
      {block.content ? highlightText(block.content, searchQuery) : <span className="opacity-40">Empty note</span>}
    </p>
  );
}
