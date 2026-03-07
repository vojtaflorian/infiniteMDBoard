"use client";

import { useMemo } from "react";
import { useCanvasStore } from "@/stores/canvasStore";
import { useUIStore } from "@/stores/uiStore";
import { getBlocksInFrame } from "@/lib/geometry";
import type { Block } from "@/types";

interface FrameBlockProps {
  block: Block;
  isEditing: boolean;
}

export function FrameBlock({ block }: FrameBlockProps) {
  const { isDarkMode } = useUIStore();
  const blocks = useCanvasStore((s) => s.blocks);

  // Aggregate stats from AI blocks inside this frame
  const stats = useMemo(() => {
    const children = getBlocksInFrame(block, blocks);
    const aiChildren = children.filter(b => b.type.startsWith("ai-"));
    if (aiChildren.length === 0) return null;

    let totalDuration = 0;
    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    let hasStats = false;

    for (const child of aiChildren) {
      if (child.executionDurationMs != null) {
        totalDuration += child.executionDurationMs;
        hasStats = true;
      }
      if (child.executionTokens) {
        totalInputTokens += child.executionTokens.input;
        totalOutputTokens += child.executionTokens.output;
        hasStats = true;
      }
    }

    if (!hasStats) return null;
    return { totalDuration, totalInputTokens, totalOutputTokens, count: aiChildren.length };
  }, [block, blocks]);

  return (
    <div className={`w-full h-full min-h-[200px] relative ${isDarkMode ? "text-zinc-600" : "text-slate-300"}`}>
      {!block.content && (
        <p className="text-xs opacity-50 select-none">Drop blocks here</p>
      )}
      {stats && (
        <div className={`absolute bottom-2 right-2 text-[10px] font-mono px-2 py-1 rounded-md ${
          isDarkMode ? "bg-zinc-800/80 text-zinc-400" : "bg-white/80 text-slate-500"
        }`}>
          {stats.totalDuration > 0 && (
            <span>{(stats.totalDuration / 1000).toFixed(1)}s</span>
          )}
          {(stats.totalInputTokens > 0 || stats.totalOutputTokens > 0) && (
            <span>{stats.totalDuration > 0 ? " · " : ""}↑{stats.totalInputTokens} ↓{stats.totalOutputTokens} tok</span>
          )}
        </div>
      )}
    </div>
  );
}
