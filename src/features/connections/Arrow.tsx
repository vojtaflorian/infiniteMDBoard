"use client";

import { useState } from "react";
import { Trash2, ArrowRight, ArrowLeftRight, Ban } from "lucide-react";
import { useCanvasStore } from "@/stores/canvasStore";
import type { ConnectionStyle, Position } from "@/types";

interface ArrowProps {
  id: string;
  pathData: string;
  midpoint: Position;
  label: string;
  stroke: string;
  isDarkMode: boolean;
  connectionStyle?: ConnectionStyle;
}

export function Arrow({ id, pathData, midpoint, label, stroke, isDarkMode, connectionStyle = "arrow" }: ArrowProps) {
  const deleteConnection = useCanvasStore((s) => s.deleteConnection);
  const updateConnection = useCanvasStore((s) => s.updateConnection);
  const [hovered, setHovered] = useState(false);
  const [editing, setEditing] = useState(false);

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
          connectionStyle === "blocker"
            ? "#ef4444"
            : hovered
              ? (isDarkMode ? "#a1a1aa" : "#64748b")
              : stroke
        }
        strokeWidth={hovered ? 3 : 2}
        fill="none"
        markerEnd={connectionStyle === "blocker" ? "url(#blocker)" : "url(#arrowhead)"}
        markerStart={connectionStyle === "bidirectional" ? "url(#arrowhead-start)" : undefined}
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
      {/* Style picker + delete button on hover — centered on midpoint below label */}
      {hovered && !editing && (
        <foreignObject
          x={midpoint.x - 55}
          y={midpoint.y + 10}
          width="110"
          height="24"
          style={{ overflow: "visible", pointerEvents: "auto" }}
        >
          <div className="flex items-center justify-center gap-1">
            {(
              [
                { style: "arrow" as ConnectionStyle, icon: ArrowRight, title: "Arrow" },
                { style: "bidirectional" as ConnectionStyle, icon: ArrowLeftRight, title: "Bidirectional" },
                { style: "blocker" as ConnectionStyle, icon: Ban, title: "Blocker" },
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
    </g>
  );
}
