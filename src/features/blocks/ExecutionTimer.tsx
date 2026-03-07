"use client";

import { useState, useEffect } from "react";
import { Timer } from "lucide-react";

interface ExecutionTimerProps {
  startedAt?: number;
  durationMs?: number;
  isRunning: boolean;
  isDarkMode: boolean;
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`;
}

export function ExecutionTimer({ startedAt, durationMs, isRunning, isDarkMode }: ExecutionTimerProps) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!isRunning || !startedAt) return;
    const interval = setInterval(() => setElapsed(Date.now() - startedAt), 100);
    return () => clearInterval(interval);
  }, [isRunning, startedAt]);

  const display = isRunning ? elapsed : (durationMs ?? 0);
  if (display === 0 && !isRunning) return null;

  return (
    <div className={`absolute -top-7 right-0 flex items-center gap-1 text-[10px] font-mono ${
      isRunning
        ? "text-blue-500"
        : isDarkMode ? "text-zinc-500" : "text-slate-400"
    }`}>
      <Timer size={10} />
      {formatDuration(display)}
    </div>
  );
}
