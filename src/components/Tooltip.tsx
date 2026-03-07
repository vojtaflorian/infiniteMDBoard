"use client";

import { useUIStore } from "@/stores/uiStore";

interface TooltipProps {
  label: string;
  children: React.ReactNode;
}

export function Tooltip({ label, children }: TooltipProps) {
  const { isDarkMode } = useUIStore();
  return (
    <div className="relative group">
      {children}
      <div className={`absolute top-full left-1/2 -translate-x-1/2 mt-2 px-2 py-1 rounded-md text-[10px] font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-[100] ${
        isDarkMode ? "bg-zinc-700 text-zinc-200" : "bg-slate-800 text-white"
      }`}>
        {label}
      </div>
    </div>
  );
}
