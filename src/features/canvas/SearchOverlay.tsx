"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { Search, X } from "lucide-react";
import { useCanvasStore } from "@/stores/canvasStore";
import { useUIStore } from "@/stores/uiStore";

interface SearchOverlayProps {
  onClose: () => void;
}

export function SearchOverlay({ onClose }: SearchOverlayProps) {
  const blocks = useCanvasStore((s) => s.blocks);
  const setCamera = useCanvasStore((s) => s.setCamera);
  const setSelectedBlock = useCanvasStore((s) => s.setSelectedBlock);
  const { isDarkMode } = useUIStore();
  const [query, setQuery] = useState("");
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const results = query.length >= 2
    ? blocks.filter(
        (b) =>
          b.type !== "frame" &&
          (b.title.toLowerCase().includes(query.toLowerCase()) ||
           b.content.toLowerCase().includes(query.toLowerCase())),
      ).slice(0, 8)
    : [];

  const jumpToBlock = useCallback((blockId: string) => {
    const block = blocks.find((b) => b.id === blockId);
    if (!block) return;
    const cx = block.position.x + block.width / 2;
    const cy = block.position.y + (block.height > 0 ? block.height : 80) / 2;
    setCamera({
      x: -cx + window.innerWidth / 2 / useCanvasStore.getState().camera.zoom,
      y: -cy + window.innerHeight / 2 / useCanvasStore.getState().camera.zoom,
    });
    setSelectedBlock(blockId);
  }, [blocks, setCamera, setSelectedBlock]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Escape") { onClose(); return; }
    if (e.key === "ArrowDown") { e.preventDefault(); setSelectedIdx((i) => Math.min(i + 1, results.length - 1)); }
    if (e.key === "ArrowUp") { e.preventDefault(); setSelectedIdx((i) => Math.max(i - 1, 0)); }
    if (e.key === "Enter" && results[selectedIdx]) {
      jumpToBlock(results[selectedIdx].id);
      onClose();
    }
  }, [results, selectedIdx, jumpToBlock, onClose]);

  useEffect(() => { setSelectedIdx(0); }, [query]);
  useEffect(() => { inputRef.current?.focus(); }, []);

  return (
    <div className="absolute top-20 left-1/2 -translate-x-1/2 z-50 w-80">
      <div className={`rounded-xl border shadow-2xl backdrop-blur-md overflow-hidden ${
        isDarkMode ? "bg-zinc-900/95 border-zinc-700" : "bg-white/95 border-slate-200"
      }`}>
        <div className="flex items-center gap-2 px-3 py-2 border-b border-inherit">
          <Search size={16} className="opacity-40 shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search blocks..."
            className={`flex-1 bg-transparent outline-none text-sm ${
              isDarkMode ? "text-white placeholder:text-zinc-500" : "text-slate-900 placeholder:text-slate-400"
            }`}
          />
          <button onClick={onClose} className="opacity-40 hover:opacity-100">
            <X size={16} />
          </button>
        </div>
        {results.length > 0 && (
          <div className="max-h-64 overflow-y-auto">
            {results.map((block, i) => (
              <button
                key={block.id}
                onClick={() => { jumpToBlock(block.id); onClose(); }}
                className={`w-full text-left px-3 py-2 text-sm flex flex-col gap-0.5 ${
                  i === selectedIdx
                    ? isDarkMode ? "bg-zinc-800" : "bg-slate-100"
                    : isDarkMode ? "hover:bg-zinc-800/50" : "hover:bg-slate-50"
                }`}
              >
                <span className={`font-medium truncate ${isDarkMode ? "text-zinc-200" : "text-slate-700"}`}>
                  {block.title || block.type}
                </span>
                <span className={`text-xs truncate ${isDarkMode ? "text-zinc-500" : "text-slate-400"}`}>
                  {block.content.slice(0, 80)}
                </span>
              </button>
            ))}
          </div>
        )}
        {query.length >= 2 && results.length === 0 && (
          <div className={`px-3 py-3 text-sm ${isDarkMode ? "text-zinc-500" : "text-slate-400"}`}>
            No results
          </div>
        )}
      </div>
    </div>
  );
}
