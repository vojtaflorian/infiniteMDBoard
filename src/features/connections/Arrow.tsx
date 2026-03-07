"use client";

import { useState } from "react";
import { Trash2, ArrowRight, ArrowLeftRight, Ban, RefreshCw, Settings } from "lucide-react";
import { useCanvasStore } from "@/stores/canvasStore";
import type { ConnectionStyle, LoopConfig, Position } from "@/types";

interface ArrowProps {
  id: string;
  pathData: string;
  midpoint: Position;
  label: string;
  stroke: string;
  isDarkMode: boolean;
  connectionStyle?: ConnectionStyle;
  loopConfig?: LoopConfig;
  fromStatus?: string;
  toStatus?: string;
  isAiConnection?: boolean;
}

export function Arrow({ id, pathData, midpoint, label, stroke, isDarkMode, connectionStyle = "arrow", loopConfig, fromStatus, toStatus, isAiConnection }: ArrowProps) {
  const deleteConnection = useCanvasStore((s) => s.deleteConnection);
  const updateConnection = useCanvasStore((s) => s.updateConnection);
  const [hovered, setHovered] = useState(false);
  const [editing, setEditing] = useState(false);
  const [showLoopConfig, setShowLoopConfig] = useState(false);

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    deleteConnection(id);
  };

  const handleLabelClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditing(true);
  };

  const handleLabelBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    setEditing(false);
    updateConnection(id, { label: e.target.value });
  };

  const handleLabelKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      (e.target as HTMLInputElement).blur();
    }
    if (e.key === "Escape") {
      setEditing(false);
    }
  };

  return (
    <g
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); }}
      style={{ pointerEvents: "auto" }}
    >
      {/* Invisible wider hit area for hover */}
      <path
        d={pathData}
        stroke="transparent"
        strokeWidth="16"
        fill="none"
        style={{ cursor: "pointer" }}
      />
      {/* Visible arrow */}
      <path
        d={pathData}
        stroke={
          fromStatus === "success" && toStatus === "success"
            ? "#22c55e"
            : connectionStyle === "blocker"
              ? "#ef4444"
              : connectionStyle === "loop"
                ? "#f97316"
                : connectionStyle === "debate"
                  ? "#8b5cf6"
                  : isAiConnection && connectionStyle === "arrow"
                    ? "#60a5fa"
                    : hovered
                      ? (isDarkMode ? "#a1a1aa" : "#64748b")
                      : stroke
        }
        strokeWidth={isAiConnection && connectionStyle === "arrow" ? 3 : hovered ? 3 : 2}
        fill="none"
        markerEnd={connectionStyle === "blocker" ? "url(#blocker)" : (connectionStyle === "loop" || connectionStyle === "debate") ? "url(#loop-marker)" : isAiConnection && connectionStyle === "arrow" ? "url(#arrowhead-ai)" : "url(#arrowhead)"}
        markerStart={connectionStyle === "bidirectional" || connectionStyle === "debate" ? "url(#arrowhead-start)" : undefined}
        strokeDasharray={
          fromStatus === "success" && toStatus === "running"
            ? "8 4"
            : connectionStyle === "loop" || connectionStyle === "debate"
              ? "6 3"
              : undefined
        }
        style={
          fromStatus === "success" && toStatus === "running"
            ? { animation: "dash-flow 0.6s linear infinite" }
            : undefined
        }
      />
      {/* Label */}
      {(label || hovered) && (
        <foreignObject
          x={midpoint.x - 60}
          y={midpoint.y - 14}
          width="120"
          height="28"
          style={{ overflow: "visible", pointerEvents: "auto" }}
        >
          {editing ? (
            <input
              autoFocus
              defaultValue={label}
              onBlur={handleLabelBlur}
              onKeyDown={handleLabelKeyDown}
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              className={`w-full text-center text-xs px-2 py-1 rounded outline-none border ${
                isDarkMode
                  ? "bg-zinc-800 border-zinc-600 text-white"
                  : "bg-white border-slate-300 text-slate-900"
              }`}
            />
          ) : (
            <div
              onClick={handleLabelClick}
              onMouseDown={(e) => e.stopPropagation()}
              className={`text-center text-xs px-2 py-1 rounded cursor-text select-none ${
                label
                  ? isDarkMode
                    ? "bg-zinc-800/90 text-zinc-300"
                    : "bg-white/90 text-slate-600"
                  : hovered
                    ? isDarkMode
                      ? "text-zinc-500"
                      : "text-slate-400"
                    : ""
              }`}
            >
              {label || (hovered ? "click to label" : "")}
            </div>
          )}
        </foreignObject>
      )}
      {/* Connection controls on hover */}
      {hovered && !editing && (
        <foreignObject
          x={midpoint.x - (isAiConnection ? 14 : 55)}
          y={midpoint.y + 10}
          width={isAiConnection ? 28 : 110}
          height="24"
          style={{ overflow: "visible", pointerEvents: "auto" }}
        >
          <div className="flex items-center justify-center gap-1">
            {/* Full style picker only for non-AI connections */}
            {!isAiConnection && (
              [
                { style: "arrow" as ConnectionStyle, icon: ArrowRight, title: "Arrow" },
                { style: "bidirectional" as ConnectionStyle, icon: ArrowLeftRight, title: "Bidirectional" },
                { style: "blocker" as ConnectionStyle, icon: Ban, title: "Blocker" },
                { style: "loop" as ConnectionStyle, icon: RefreshCw, title: "Loop" },
                { style: "debate" as ConnectionStyle, icon: ArrowLeftRight, title: "Debate" },
              ] as const
            ).map(({ style: s, icon: Icon, title }) => (
              <button
                key={s}
                onClick={(e) => {
                  e.stopPropagation();
                  updateConnection(id, { style: s });
                }}
                onMouseDown={(e) => e.stopPropagation()}
                className={`w-5 h-5 flex items-center justify-center rounded-full ${
                  s === "blocker"
                    ? connectionStyle === s
                      ? "bg-red-500 text-white ring-2 ring-red-400"
                      : "bg-red-500/60 hover:bg-red-500/80 text-white"
                    : connectionStyle === s
                      ? isDarkMode
                        ? "bg-zinc-600 text-white ring-2 ring-zinc-400"
                        : "bg-slate-500 text-white ring-2 ring-slate-400"
                      : isDarkMode
                        ? "bg-zinc-700 hover:bg-zinc-600 text-zinc-300"
                        : "bg-slate-300 hover:bg-slate-400 text-slate-700"
                }`}
                title={title}
              >
                <Icon size={11} />
              </button>
            ))}
            {!isAiConnection && (connectionStyle === "loop" || connectionStyle === "debate") && (
              <button
                onClick={(e) => { e.stopPropagation(); setShowLoopConfig((v) => !v); }}
                onMouseDown={(e) => e.stopPropagation()}
                className={`w-5 h-5 flex items-center justify-center rounded-full ${
                  isDarkMode ? "bg-zinc-700 hover:bg-zinc-600 text-zinc-300" : "bg-slate-300 hover:bg-slate-400 text-slate-700"
                }`}
                title="Loop settings"
              >
                <Settings size={11} />
              </button>
            )}
            <button
              onClick={handleDelete}
              onMouseDown={(e) => e.stopPropagation()}
              className="w-5 h-5 flex items-center justify-center rounded-full bg-red-500/80 hover:bg-red-500 text-white"
              title="Delete connection"
            >
              <Trash2 size={12} />
            </button>
          </div>
        </foreignObject>
      )}
      {/* Loop badge */}
      {loopConfig?.enabled && (
        <foreignObject
          x={midpoint.x + 50}
          y={midpoint.y - 10}
          width="40"
          height="20"
          style={{ overflow: "visible", pointerEvents: "none" }}
        >
          <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${
            isDarkMode ? "bg-orange-900/60 text-orange-400" : "bg-orange-100 text-orange-700"
          }`}>
            {loopConfig.maxIterations}x
          </span>
        </foreignObject>
      )}
      {/* Loop config panel */}
      {showLoopConfig && (connectionStyle === "loop" || connectionStyle === "debate") && (
        <foreignObject
          x={midpoint.x - 100}
          y={midpoint.y + 34}
          width="200"
          height="120"
          style={{ overflow: "visible", pointerEvents: "auto" }}
        >
          <div
            className={`p-2 rounded-lg border shadow-lg text-xs space-y-1.5 ${
              isDarkMode ? "bg-zinc-800 border-zinc-700" : "bg-white border-slate-200"
            }`}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2">
              <label className={`w-16 shrink-0 ${isDarkMode ? "text-zinc-400" : "text-slate-500"}`}>Max iter</label>
              <input
                type="number"
                min="1"
                max="10"
                value={loopConfig?.maxIterations ?? 3}
                onChange={(e) => updateConnection(id, {
                  style: connectionStyle,
                  loopConfig: { enabled: true, maxIterations: Math.min(10, Math.max(1, parseInt(e.target.value) || 3)), condition: loopConfig?.condition },
                })}
                className={`flex-1 px-1.5 py-0.5 rounded border outline-none ${
                  isDarkMode ? "bg-zinc-900 border-zinc-700 text-zinc-200" : "bg-slate-50 border-slate-200 text-slate-700"
                }`}
              />
            </div>
            <div className="flex items-center gap-2">
              <label className={`w-16 shrink-0 ${isDarkMode ? "text-zinc-400" : "text-slate-500"}`}>JSON path</label>
              <input
                placeholder="$.done"
                value={loopConfig?.condition?.jsonPath ?? ""}
                onChange={(e) => updateConnection(id, {
                  style: connectionStyle,
                  loopConfig: {
                    enabled: true,
                    maxIterations: loopConfig?.maxIterations ?? 3,
                    condition: e.target.value ? { jsonPath: e.target.value, operator: loopConfig?.condition?.operator ?? "eq", value: loopConfig?.condition?.value ?? true } : undefined,
                  },
                })}
                className={`flex-1 px-1.5 py-0.5 rounded border outline-none font-mono ${
                  isDarkMode ? "bg-zinc-900 border-zinc-700 text-zinc-200" : "bg-slate-50 border-slate-200 text-slate-700"
                }`}
              />
            </div>
          </div>
        </foreignObject>
      )}
    </g>
  );
}
