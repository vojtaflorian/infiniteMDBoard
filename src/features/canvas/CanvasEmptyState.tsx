"use client";

import { MousePointerClick, Image, Search, Move } from "lucide-react";
import { useUIStore } from "@/stores/uiStore";

const hints = [
  { icon: MousePointerClick, label: "Click toolbar buttons to add blocks" },
  { icon: Image, label: "Drag & drop images onto canvas" },
  { icon: Search, label: "\u2318F to search, \u2318Z to undo" },
  { icon: Move, label: "Space + drag to pan" },
];

export function CanvasEmptyState() {
  const { isDarkMode } = useUIStore();

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center pointer-events-none select-none">
      <div
        className={`flex flex-col items-center gap-5 px-8 py-10 rounded-2xl backdrop-blur-sm ${
          isDarkMode
            ? "bg-zinc-900/40 text-zinc-500"
            : "bg-slate-100/50 text-slate-400"
        }`}
      >
        <h2
          className={`text-lg font-semibold tracking-tight ${
            isDarkMode ? "text-zinc-400" : "text-slate-500"
          }`}
        >
          Start building
        </h2>
        <ul className="flex flex-col gap-3 text-sm">
          {hints.map((h) => (
            <li key={h.label} className="flex items-center gap-2.5">
              <h.icon size={16} className="shrink-0 opacity-60" />
              <span>{h.label}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
