"use client";

import { useUIStore } from "@/stores/uiStore";
import type { Block } from "@/types";

interface FrameBlockProps {
  block: Block;
  isEditing: boolean;
}

export function FrameBlock({ block }: FrameBlockProps) {
  const { isDarkMode } = useUIStore();
  return (
    <div className={`w-full h-full min-h-[200px] ${isDarkMode ? "text-zinc-600" : "text-slate-300"}`}>
      {!block.content && (
        <p className="text-xs opacity-50 select-none">Drop blocks here</p>
      )}
    </div>
  );
}
