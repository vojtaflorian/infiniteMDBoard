"use client";

import { useState } from "react";
import { GripVertical, Trash2, Maximize2, Globe, Code2, Sparkles, Languages, Copy, Square, Circle, Diamond, ArrowRightLeft } from "lucide-react";
import { isSpaceHeld } from "@/features/canvas/Canvas";
import { useCanvasStore } from "@/stores/canvasStore";
import { createLogger } from "@/lib/logger";
import { useUIStore } from "@/stores/uiStore";
import { TextBlock } from "./TextBlock";
import { ImageBlock } from "./ImageBlock";
import { LinkBlock } from "./LinkBlock";
import { StickyBlock } from "./StickyBlock";
import { FrameBlock } from "./FrameBlock";
import type { Block, BlockShape } from "@/types";

const log = createLogger("BlockRenderer");

const stickyBgMap: Record<string, string> = {
  yellow: "bg-yellow-200 border-yellow-300",
  pink: "bg-pink-200 border-pink-300",
  green: "bg-green-200 border-green-300",
  blue: "bg-blue-200 border-blue-300",
  purple: "bg-purple-200 border-purple-300",
};

const shapeOptions: { value: BlockShape; icon: typeof Square; label: string }[] = [
  { value: "rect", icon: Square, label: "Rectangle" },
  { value: "oval", icon: Circle, label: "Oval" },
  { value: "diamond", icon: Diamond, label: "Diamond" },
  { value: "parallelogram", icon: ArrowRightLeft, label: "Parallelogram" },
];

const SHAPE_STYLES: Record<BlockShape, { className: string; style: React.CSSProperties }> = {
  rect:          { className: "rounded-xl", style: {} },
  oval:          { className: "rounded-full", style: { padding: "1.5rem 3rem" } },
  diamond:       { className: "", style: { clipPath: "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)", padding: "25% 25%", textAlign: "center" } },
  parallelogram: { className: "", style: { clipPath: "polygon(12% 0%, 100% 0%, 88% 100%, 0% 100%)", padding: "1rem 15%" } },
};

interface BlockRendererProps {
  block: Block;
}

export function BlockRenderer({ block }: BlockRendererProps) {
  const activeTool = useCanvasStore((s) => s.activeTool);
  const isSelected = useCanvasStore((s) => s.selectedBlockIds.includes(block.id));
  const toggleSelectBlock = useCanvasStore((s) => s.toggleSelectBlock);
  const editingBlockId = useCanvasStore((s) => s.editingBlockId);
  const connectingFromId = useCanvasStore((s) => s.connectingFromId);
  const deleteBlock = useCanvasStore((s) => s.deleteBlock);
  const duplicateBlock = useCanvasStore((s) => s.duplicateBlock);
  const setSelectedBlock = useCanvasStore((s) => s.setSelectedBlock);
  const setEditingBlock = useCanvasStore((s) => s.setEditingBlock);
  const setDraggingBlock = useCanvasStore((s) => s.setDraggingBlock);
  const setResizingBlock = useCanvasStore((s) => s.setResizingBlock);
  const setConnectingFrom = useCanvasStore((s) => s.setConnectingFrom);
  const addConnection = useCanvasStore((s) => s.addConnection);
  const setTool = useCanvasStore((s) => s.setTool);
  const updateBlock = useCanvasStore((s) => s.updateBlock);
  const { isDarkMode } = useUIStore();
  const [isFormatting, setIsFormatting] = useState(false);

  const isEditing = editingBlockId === block.id;

  const shape = block.shape ?? "rect";
  const shapeStyles = SHAPE_STYLES[shape];
  const isClipped = shape === "diamond" || shape === "parallelogram";

  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();

    if (activeTool === "connect") {
      if (!connectingFromId) {
        setConnectingFrom(block.id);
      } else if (connectingFromId !== block.id) {
        addConnection(connectingFromId, block.id);
        setConnectingFrom(null);
        setTool("select");
      }
      return;
    }

    if (activeTool === "select") {
      if (e.shiftKey) {
        toggleSelectBlock(block.id);
        return;
      }
      if (isSpaceHeld() || block.type === "frame") {
        // Spacebar held or frame block → drag instead of edit
        setSelectedBlock(block.id);
        setEditingBlock(null);
        setDraggingBlock(block.id);
      } else {
        setSelectedBlock(block.id);
        setEditingBlock(block.id);
      }
    }
  };

  const handleGripMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (activeTool === "select") {
      setSelectedBlock(block.id);
      setEditingBlock(null);
      setDraggingBlock(block.id);
    }
  };

  // Capture-phase handler: space+drag works on all blocks even if inner elements stop propagation
  const handleMouseDownCapture = (e: React.MouseEvent) => {
    if (activeTool === "select" && isSpaceHeld()) {
      e.stopPropagation();
      e.preventDefault();
      setSelectedBlock(block.id);
      setEditingBlock(null);
      setDraggingBlock(block.id);
    }
  };

  const handleResizeMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setResizingBlock(block.id);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    deleteBlock(block.id);
  };

  return (
    <div
      data-block-id={block.id}
      className="absolute group"
      style={{
        left: block.position.x,
        top: block.position.y,
        width: block.width,
        zIndex: block.type === "frame" ? 0 : block.zIndex,
      }}
      onMouseDown={handleMouseDown}
      onMouseDownCapture={handleMouseDownCapture}
    >
      {/* Title input */}
      <input
        className={`absolute -top-7 left-0 w-full text-xs font-semibold bg-transparent outline-none truncate ${
          isDarkMode ? "text-zinc-400" : "text-slate-500"
        }`}
        value={block.title}
        onChange={(e) => updateBlock(block.id, { title: e.target.value })}
        onMouseDown={(e) => e.stopPropagation()}
      />

      {/* Drag grip */}
      <div
        onMouseDown={handleGripMouseDown}
        className={`absolute top-1/2 -left-5 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab ${
          isDarkMode ? "text-zinc-600" : "text-slate-400"
        }`}
      >
        <GripVertical size={16} />
      </div>

      {/* Action buttons */}
      <div className="absolute -top-3 -right-3 z-10 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {(block.height > 0 || (block.type === "text" && block.width !== 250)) && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (block.type === "text") {
                const lines = block.content.split("\n");
                const maxLineLen = Math.max(...lines.map((l) => l.length));
                const fitWidth = Math.min(600, Math.max(250, maxLineLen * 7 + 40));
                updateBlock(block.id, { width: fitWidth, height: 0 });
              } else {
                updateBlock(block.id, { height: 0 });
              }
            }}
            className={`p-1 rounded-full shadow-sm border ${
              isDarkMode
                ? "bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-blue-400"
                : "bg-white border-slate-200 text-slate-500 hover:text-blue-500"
            }`}
            title="Fit to content"
          >
            <Maximize2 size={12} />
          </button>
        )}
        {block.type === "link" && block.content && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              updateBlock(block.id, { embed: !block.embed });
            }}
            className={`p-1 rounded-full shadow-sm border ${
              isDarkMode
                ? "bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-blue-400"
                : "bg-white border-slate-200 text-slate-500 hover:text-blue-500"
            }`}
            title={block.embed ? "Show as link preview" : "Show as embed"}
          >
            {block.embed ? <Globe size={12} /> : <Code2 size={12} />}
          </button>
        )}
        {block.type === "text" && block.content.trim().length > 0 && (
          <button
            onClick={async (e) => {
              e.stopPropagation();
              if (isFormatting) return;
              log.info("AI format started", block.id);
              setIsFormatting(true);
              try {
                const res = await fetch("/api/format", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ content: block.content }),
                });
                if (!res.ok) throw new Error("Format failed");
                const data = await res.json();
                if (data.formatted) {
                  updateBlock(block.id, { content: data.formatted });
                }
              } catch (err) {
                log.error("AI format error", err);
              } finally {
                setIsFormatting(false);
              }
            }}
            disabled={isFormatting}
            className={`p-1 rounded-full shadow-sm border ${
              isDarkMode
                ? "bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-purple-400"
                : "bg-white border-slate-200 text-slate-500 hover:text-purple-500"
            } ${isFormatting ? "animate-pulse" : ""}`}
            title="AI Format"
          >
            <Sparkles size={12} />
          </button>
        )}
        {block.type === "text" && block.content.trim().length > 0 && (
          <button
            onClick={async (e) => {
              e.stopPropagation();
              if (isFormatting) return;
              log.info("AI translate started", block.id);
              setIsFormatting(true);
              try {
                const res = await fetch("/api/format", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ content: block.content, translate: true }),
                });
                if (!res.ok) throw new Error("Translate failed");
                const data = await res.json();
                if (data.formatted) {
                  updateBlock(block.id, { content: data.formatted });
                }
              } catch (err) {
                log.error("AI translate error", err);
              } finally {
                setIsFormatting(false);
              }
            }}
            disabled={isFormatting}
            className={`p-1 rounded-full shadow-sm border ${
              isDarkMode
                ? "bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-sky-400"
                : "bg-white border-slate-200 text-slate-500 hover:text-sky-500"
            } ${isFormatting ? "animate-pulse" : ""}`}
            title="Translate to English"
          >
            <Languages size={12} />
          </button>
        )}
        <button
          onClick={(e) => {
            e.stopPropagation();
            duplicateBlock(block.id);
          }}
          className={`p-1 rounded-full shadow-sm border ${
            isDarkMode
              ? "bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-green-400"
              : "bg-white border-slate-200 text-slate-500 hover:text-green-500"
          }`}
          title="Duplicate block"
        >
          <Copy size={12} />
        </button>
        <button
          onClick={handleDelete}
          className="p-1 rounded-full bg-red-500/80 hover:bg-red-500 text-white"
        >
          <Trash2 size={12} />
        </button>
      </div>

      {/* Shape picker (all blocks except frame) — bottom-left to not block title */}
      {block.type !== "frame" && (
        <div className="absolute -bottom-3 -left-3 z-10 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          {shapeOptions.map(({ value, icon: Icon, label }) => (
            <button
              key={value}
              onClick={(e) => {
                e.stopPropagation();
                updateBlock(block.id, { shape: value === "rect" ? undefined : value });
              }}
              className={`w-5 h-5 flex items-center justify-center rounded border transition-transform ${
                shape === value
                  ? "border-blue-500 text-blue-500 scale-110"
                  : isDarkMode
                    ? "border-zinc-700 text-zinc-500 hover:text-zinc-300 bg-zinc-800"
                    : "border-slate-200 text-slate-400 hover:text-slate-600 bg-white"
              }`}
              title={label}
            >
              <Icon size={10} />
            </button>
          ))}
        </div>
      )}

      {/* Color picker (sticky blocks only) */}
      {block.type === "sticky" && (
        <div className="absolute -top-3 -left-3 z-10 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {(["yellow", "pink", "green", "blue", "purple"] as const).map(
            (c) => (
              <button
                key={c}
                onClick={(e) => {
                  e.stopPropagation();
                  updateBlock(block.id, { color: c });
                }}
                className={`w-4 h-4 rounded-full border-2 transition-transform hover:scale-125 ${stickyBgMap[c].split(" ")[0]} ${
                  block.color === c
                    ? "border-slate-700 scale-110"
                    : "border-transparent"
                }`}
                title={c}
              />
            ),
          )}
        </div>
      )}

      {/* Block card */}
      <div
        className={`${shapeStyles.className} p-4 border transition-all ${
          block.type === "frame"
            ? isDarkMode
              ? "bg-zinc-900/30 border-zinc-700 border-dashed"
              : "bg-slate-100/30 border-slate-300 border-dashed"
            : block.type === "sticky" && block.color
              ? stickyBgMap[block.color] ?? "bg-yellow-200 border-yellow-300"
              : isDarkMode
                ? "bg-zinc-900/90 border-zinc-800"
                : "bg-white/90 border-slate-200"
        } ${
          isSelected
            ? isDarkMode
              ? "ring-2 ring-blue-500/50 border-blue-500/30"
              : "ring-2 ring-blue-400/50 border-blue-400/30"
            : ""
        } ${isEditing ? "shadow-xl" : "shadow-lg"} ${!isClipped ? "backdrop-blur-sm" : ""}`}
        style={{
          ...(block.type !== "text" && block.height > 0
            ? { height: block.height, overflowY: "auto" as const }
            : {}),
          ...shapeStyles.style,
          ...(isClipped ? { filter: "drop-shadow(0 4px 6px rgba(0,0,0,0.1))" } : {}),
        }}
      >
        {(() => {
          switch (block.type) {
            case "text":
              return <TextBlock block={block} isEditing={isEditing} />;
            case "image":
              return <ImageBlock block={block} isEditing={isEditing} />;
            case "link":
              return <LinkBlock block={block} isEditing={isEditing} />;
            case "sticky":
              return <StickyBlock block={block} isEditing={isEditing} />;
            case "frame":
              return <FrameBlock block={block} isEditing={isEditing} />;
          }
        })()}
      </div>

      {/* Connection overlay when connect tool is active */}
      {activeTool === "connect" && (
        <div
          className={`absolute inset-0 ${shapeStyles.className || "rounded-xl"} border-2 border-dashed pointer-events-none ${
            connectingFromId === block.id
              ? "border-purple-500 bg-purple-500/10"
              : "border-purple-300/50 hover:border-purple-400 hover:bg-purple-500/5"
          }`}
          style={isClipped ? { clipPath: shapeStyles.style.clipPath as string } : undefined}
        />
      )}

      {/* Resize handle */}
      <div
        onMouseDown={handleResizeMouseDown}
        className={`absolute -bottom-1 -right-1 opacity-0 group-hover:opacity-50 transition-opacity cursor-nwse-resize p-2 ${
          isDarkMode ? "text-zinc-600" : "text-slate-400"
        }`}
      >
        <svg width="12" height="12" viewBox="0 0 10 10">
          <path
            d="M9 1L1 9M9 5L5 9"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </div>
    </div>
  );
}
