"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { GripVertical, Trash2, Maximize2, Globe, Code2, Sparkles, Languages, Copy, Square, Circle, Diamond, ArrowRightLeft, Loader2, MessageSquare, Send, X, ChevronUp, ChevronDown, Play } from "lucide-react";
import { isSpaceHeld } from "@/features/canvas/Canvas";
import { useCanvasStore } from "@/stores/canvasStore";
import { runPipeline } from "@/lib/execution/engine";
import { createLogger } from "@/lib/logger";
import { useUIStore } from "@/stores/uiStore";
import { TextBlock } from "./TextBlock";
import { ImageBlock } from "./ImageBlock";
import { LinkBlock } from "./LinkBlock";
import { StickyBlock } from "./StickyBlock";
import { FrameBlock } from "./FrameBlock";
import { AIAgentBlock } from "./AIAgentBlock";
import { AIInputBlock } from "./AIInputBlock";
import { AIViewerBlock } from "./AIViewerBlock";
import { ExecutionTimer } from "./ExecutionTimer";
import type { Block, BlockShape } from "@/types";

const log = createLogger("BlockRenderer");

const stickyBgMap: Record<string, string> = {
  yellow: "bg-yellow-200 border-yellow-300",
  pink: "bg-pink-200 border-pink-300",
  green: "bg-green-200 border-green-300",
  blue: "bg-blue-200 border-blue-300",
  purple: "bg-purple-200 border-purple-300",
};

const frameBorderMap: Record<string, { dark: string; light: string }> = {
  yellow: { dark: "border-yellow-500/80", light: "border-yellow-400" },
  pink:   { dark: "border-pink-500/80",   light: "border-pink-400" },
  green:  { dark: "border-green-500/80",  light: "border-green-400" },
  blue:   { dark: "border-blue-500/80",   light: "border-blue-400" },
  purple: { dark: "border-purple-500/80", light: "border-purple-400" },
};

const frameBgMap: Record<string, { dark: string; light: string }> = {
  yellow: { dark: "bg-yellow-500/[0.06]", light: "bg-yellow-100/40" },
  pink:   { dark: "bg-pink-500/[0.06]",   light: "bg-pink-100/40" },
  green:  { dark: "bg-green-500/[0.06]",  light: "bg-green-100/40" },
  blue:   { dark: "bg-blue-500/[0.06]",   light: "bg-blue-100/40" },
  purple: { dark: "bg-purple-500/[0.06]", light: "bg-purple-100/40" },
};

const colorOptions = ["yellow", "pink", "green", "blue", "purple"] as const;

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
  const setPendingConnection = useCanvasStore((s) => s.setPendingConnection);
  const addConnection = useCanvasStore((s) => s.addConnection);
  const hasPendingConnection = useCanvasStore((s) => s.pendingConnection !== null);
  const setTool = useCanvasStore((s) => s.setTool);
  const updateBlock = useCanvasStore((s) => s.updateBlock);
  const isExpanded = useCanvasStore((s) => s.expandedBlockIds.includes(block.id));
  const toggleBlockExpanded = useCanvasStore((s) => s.toggleBlockExpanded);
  const { isDarkMode } = useUIStore();
  const presentationMode = useUIStore((s) => s.presentationMode);
  const searchQuery = useUIStore((s) => s.searchQuery);
  const isSearchMatch = searchQuery.length >= 2 && block.type !== "frame" && (
    block.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    block.content.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const [aiLabel, setAiLabel] = useState<string | null>(null);
  const isFormatting = aiLabel !== null;
  const [showAiMenu, setShowAiMenu] = useState(false);
  const [customPrompt, setCustomPrompt] = useState("");
  const didSpaceDrag = useRef(false);
  const aiMenuRef = useRef<HTMLDivElement>(null);
  const portDragging = useRef(false);

  const handlePortPointerDown = useCallback((e: React.PointerEvent, side: "left" | "right") => {
    e.stopPropagation();
    e.preventDefault();
    portDragging.current = true;
    const portX = side === "right"
      ? block.position.x + block.width
      : block.position.x;
    const portY = block.position.y + (block.height > 0 ? block.height / 2 : 100);
    setPendingConnection({ fromId: block.id, fromX: portX, fromY: portY, toX: portX, toY: portY });
  }, [block.id, block.position.x, block.position.y, block.width, block.height, setPendingConnection]);

  const handleBlockPointerUp = useCallback((e: React.PointerEvent) => {
    const pending = useCanvasStore.getState().pendingConnection;
    if (pending && pending.fromId !== block.id) {
      e.stopPropagation();
      addConnection(pending.fromId, block.id);
      useCanvasStore.getState().setPendingConnection(null);
    }
  }, [block.id, addConnection]);

  // Close AI menu on outside click
  useEffect(() => {
    if (!showAiMenu) return;
    const handler = (e: MouseEvent) => {
      if (aiMenuRef.current && !aiMenuRef.current.contains(e.target as Node)) {
        setShowAiMenu(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showAiMenu]);

  // Close AI menu when block is deselected
  useEffect(() => {
    if (!isSelected) setShowAiMenu(false);
  }, [isSelected]);

  const isEditing = presentationMode ? false : editingBlockId === block.id;

  const shape = block.shape ?? "rect";
  const shapeStyles = SHAPE_STYLES[shape];
  const isClipped = shape === "diamond" || shape === "parallelogram";

  const handleMouseDown = (e: React.MouseEvent) => {
    // Presentation mode: no selection, editing, or connecting — just pass through
    if (presentationMode) return;
    // Port drag is active — don't start block drag
    if (portDragging.current) {
      portDragging.current = false;
      e.stopPropagation();
      return;
    }

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
      // Determine if click landed on an editable element
      const target = e.target as HTMLElement;
      const isEditable = target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT" || target.isContentEditable;
      if (isSpaceHeld() || block.type === "frame" || !isEditable) {
        // Spacebar / frame / click on non-editable area → drag
        setSelectedBlock(block.id);
        setEditingBlock(block.type !== "frame" ? block.id : null);
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
      didSpaceDrag.current = true;
      setSelectedBlock(block.id);
      setEditingBlock(null);
      setDraggingBlock(block.id);
    }
  };

  // Suppress click on links after space+drag so they don't open
  const handleClickCapture = (e: React.MouseEvent) => {
    if (didSpaceDrag.current) {
      e.stopPropagation();
      e.preventDefault();
      didSpaceDrag.current = false;
    }
  };

  const runAi = async (label: string, payload: Record<string, unknown>) => {
    if (isFormatting) return;
    log.info(`AI ${label} started`, block.id);
    setAiLabel(label);
    setShowAiMenu(false);
    try {
      const res = await fetch("/api/format", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: block.content, ...payload }),
      });
      if (!res.ok) throw new Error(`${label} failed`);
      const data = await res.json();
      if (data.formatted) {
        updateBlock(block.id, { content: data.formatted });
      }
    } catch (err) {
      log.error(`AI ${label} error`, err);
    } finally {
      setAiLabel(null);
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
    useUIStore.getState().addToast("Block deleted — ⌘Z to undo");
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
      onClickCapture={handleClickCapture}
      onPointerUp={handleBlockPointerUp}
    >
      {/* Execution timing badge */}
      {block.type.startsWith("ai-") && (block.executionState === "running" || block.executionDurationMs != null) && (
        <ExecutionTimer
          startedAt={block.executionStartedAt}
          durationMs={block.executionDurationMs}
          isRunning={block.executionState === "running"}
          isDarkMode={isDarkMode}
        />
      )}

      {/* Title */}
      {presentationMode ? (
        block.title && (
          <div
            className={`absolute -top-7 left-0 w-full text-xs font-semibold truncate select-none ${
              isDarkMode ? "text-zinc-400" : "text-slate-500"
            }`}
          >
            {block.title}
          </div>
        )
      ) : (
        <input
          className={`absolute -top-7 left-0 w-full text-xs font-semibold bg-transparent outline-none truncate ${
            isDarkMode ? "text-zinc-400" : "text-slate-500"
          }`}
          value={block.title}
          onChange={(e) => updateBlock(block.id, { title: e.target.value })}
          onMouseDown={(e) => e.stopPropagation()}
        />
      )}

      {/* Run badge — all ai-agent blocks */}
      {!presentationMode && block.type === "ai-agent" && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            runPipeline(block.id);
          }}
          onMouseDown={(e) => e.stopPropagation()}
          className="absolute -top-3 left-1/2 -translate-x-1/2 z-10 flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-orange-500 text-white text-[10px] font-medium shadow-sm hover:bg-orange-600 transition-colors"
          title="Run flow from here"
        >
          <Play size={10} fill="currentColor" /> Run
        </button>
      )}

      {/* Drag grip */}
      {!presentationMode && (
        <div
          onMouseDown={handleGripMouseDown}
          className={`absolute top-1/2 -left-5 -translate-y-1/2 ${isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"} transition-opacity cursor-grab ${
            isDarkMode ? "text-zinc-600" : "text-slate-400"
          }`}
        >
          <GripVertical size={16} />
        </div>
      )}

      {/* Bottom drag grip */}
      {!presentationMode && (
        <div
          onMouseDown={handleGripMouseDown}
          className={`absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-full ${isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"} transition-opacity cursor-grab ${
            isDarkMode ? "text-zinc-600" : "text-slate-400"
          }`}
        >
          <GripVertical size={16} className="rotate-90" />
        </div>
      )}

      {/* Editing actions — top-left (hidden in presentation mode) */}
      {!presentationMode && <div className={`absolute -top-3 -left-3 z-10 flex gap-1 ${isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"} transition-opacity`}>
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (block.type === "text") {
              const lines = block.content.split("\n");
              const maxLineLen = Math.max(...lines.map((l) => l.length));
              const fitWidth = Math.min(1200, Math.max(250, maxLineLen * 7 + 40));
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
          <div ref={aiMenuRef} className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowAiMenu((v) => !v);
              }}
              disabled={isFormatting}
              className={`p-1 rounded-full shadow-sm border ${
                isDarkMode
                  ? "bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-purple-400"
                  : "bg-white border-slate-200 text-slate-500 hover:text-purple-500"
              } ${isFormatting ? "animate-pulse" : ""} ${showAiMenu ? (isDarkMode ? "text-purple-400" : "text-purple-500") : ""}`}
              title="AI actions"
            >
              <Sparkles size={12} />
            </button>
            {showAiMenu && (
              <div
                className={`absolute top-full left-0 mt-1 z-20 rounded-lg border shadow-lg p-1 min-w-[180px] ${
                  isDarkMode ? "bg-zinc-800 border-zinc-700" : "bg-white border-slate-200"
                }`}
                onMouseDown={(e) => e.stopPropagation()}
              >
                <button
                  onClick={(e) => { e.stopPropagation(); runAi("Formatting…", {}); }}
                  className={`flex items-center gap-2 w-full px-2 py-1.5 rounded text-xs text-left ${
                    isDarkMode ? "text-zinc-300 hover:bg-zinc-700" : "text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <Sparkles size={12} /> Format markdown
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); runAi("Translating…", { translate: true }); }}
                  className={`flex items-center gap-2 w-full px-2 py-1.5 rounded text-xs text-left ${
                    isDarkMode ? "text-zinc-300 hover:bg-zinc-700" : "text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <Languages size={12} /> Translate CZ↔EN
                </button>
                <div className={`my-1 h-px ${isDarkMode ? "bg-zinc-700" : "bg-slate-200"}`} />
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (!customPrompt.trim()) return;
                    const p = customPrompt.trim();
                    setCustomPrompt("");
                    runAi("Processing…", { prompt: p });
                  }}
                  className="flex items-center gap-1 px-1"
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  <MessageSquare size={12} className={isDarkMode ? "text-zinc-500 shrink-0" : "text-slate-400 shrink-0"} />
                  <input
                    autoFocus
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                    placeholder="Custom prompt…"
                    className={`flex-1 text-xs py-1 px-1 bg-transparent outline-none ${
                      isDarkMode ? "text-zinc-300 placeholder:text-zinc-600" : "text-slate-700 placeholder:text-slate-400"
                    }`}
                    onMouseDown={(e) => e.stopPropagation()}
                  />
                  <button
                    type="submit"
                    disabled={!customPrompt.trim()}
                    className={`p-1 rounded ${
                      customPrompt.trim()
                        ? isDarkMode ? "text-purple-400 hover:bg-zinc-700" : "text-purple-500 hover:bg-slate-100"
                        : isDarkMode ? "text-zinc-600" : "text-slate-300"
                    }`}
                  >
                    <Send size={12} />
                  </button>
                </form>
              </div>
            )}
          </div>
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
      </div>}

      {/* Styling — bottom-left (hidden in presentation mode) */}
      {!presentationMode && <div className={`absolute -bottom-3 -left-3 z-10 flex gap-1 items-center ${isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"} transition-opacity`}>
        {/* Shape picker (all blocks except frame) */}
        {block.type !== "frame" && !block.type.startsWith("ai-") && (
          <>
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
            {block.type === "sticky" && (
              <div className={`w-px h-4 ${isDarkMode ? "bg-zinc-700" : "bg-slate-300"}`} />
            )}
          </>
        )}
        {/* Color picker (sticky + frame) */}
        {(block.type === "sticky" || block.type === "frame") &&
          colorOptions.map((c) => (
            <button
              key={c}
              onClick={(e) => {
                e.stopPropagation();
                updateBlock(block.id, { color: c === block.color ? undefined : c });
              }}
              className={`w-4 h-4 rounded-full border-2 transition-transform hover:scale-125 ${stickyBgMap[c].split(" ")[0]} ${
                block.color === c
                  ? "border-slate-700 scale-110"
                  : "border-transparent"
              }`}
              title={c}
            />
          ))
        }
      </div>}

      {/* Block card */}
      <div
        className={`${shapeStyles.className} p-4 border transition-all ${
          block.type === "frame"
            ? `${block.color && frameBgMap[block.color]
                ? isDarkMode ? frameBgMap[block.color].dark : frameBgMap[block.color].light
                : isDarkMode ? "bg-zinc-900/30" : "bg-slate-100/30"
              } border-dashed ${
                block.color && frameBorderMap[block.color]
                  ? isDarkMode ? frameBorderMap[block.color].dark : frameBorderMap[block.color].light
                  : isDarkMode ? "border-zinc-700" : "border-slate-300"
              } border-2`
            : block.type === "sticky" && block.color
              ? stickyBgMap[block.color] ?? "bg-yellow-200 border-yellow-300"
              : isDarkMode
                ? "bg-zinc-900/90 border-zinc-800"
                : "bg-white/90 border-slate-200"
        } ${
          isSearchMatch
            ? "ring-2 ring-yellow-400/70 border-yellow-400/50"
            : isSelected
              ? isDarkMode
                ? "ring-2 ring-blue-500/50 border-blue-500/30"
                : "ring-2 ring-blue-400/50 border-blue-400/30"
              : ""
        } ${
          block.executionState === "running"
            ? "ring-2 ring-blue-500/50 animate-pulse"
            : block.executionState === "success"
              ? "ring-2 ring-green-500/50"
              : block.executionState === "error"
                ? "ring-2 ring-red-500/50"
                : ""
        } ${
          block.type === "ai-agent" ? "border-l-4 border-l-blue-500/70" :
          block.type === "ai-input" ? "border-l-4 border-l-green-500/70" :
          block.type === "ai-viewer" ? "border-l-4 border-l-purple-500/70" : ""
        } ${isEditing ? "shadow-xl" : "shadow-lg"} ${!isClipped ? "backdrop-blur-sm" : ""} ${block.height <= 0 ? "overflow-hidden" : ""}`}
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
            case "ai-agent":
              return <AIAgentBlock block={block} isEditing={isEditing} isExpanded={isExpanded} />;
            case "ai-input":
              return <AIInputBlock block={block} isEditing={isEditing} isExpanded={isExpanded} />;
            case "ai-viewer":
              return <AIViewerBlock block={block} isEditing={isEditing} isExpanded={isExpanded} />;
          }
        })()}
        {/* AI processing overlay */}
        {isFormatting && (
          <div className={`absolute inset-0 flex items-center justify-center rounded-xl backdrop-blur-sm z-10 ${
            isDarkMode ? "bg-zinc-900/70" : "bg-white/70"
          }`}>
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${
              isDarkMode ? "bg-zinc-800 text-zinc-300" : "bg-slate-100 text-slate-600"
            }`}>
              <Loader2 size={14} className="animate-spin" />
              {aiLabel}
            </div>
          </div>
        )}
      </div>

      {/* Expand/collapse toggle for AI blocks */}
      {!presentationMode && block.type.startsWith("ai-") && (
        <button
          onClick={(e) => { e.stopPropagation(); toggleBlockExpanded(block.id); }}
          onMouseDown={(e) => e.stopPropagation()}
          className={`absolute -top-3 -right-3 z-10 p-1 rounded-full shadow-sm border transition-opacity ${isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"} ${
            isDarkMode
              ? "bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-blue-400"
              : "bg-white border-slate-200 text-slate-500 hover:text-blue-500"
          }`}
          title={isExpanded ? "Collapse" : "Expand"}
        >
          {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </button>
      )}

      {/* Error banner — always visible below AI blocks */}
      {block.type.startsWith("ai-") && block.executionState === "error" && block.executionError && (
        <div className="mt-1 px-2 py-1 rounded-lg bg-red-500/15 border border-red-500/30 text-red-500 text-[10px] whitespace-pre-wrap break-words max-h-[60px] overflow-auto">
          {block.executionError}
        </div>
      )}

      {/* Quick-connect ports on AI blocks */}
      {!presentationMode && block.type.startsWith("ai-") && (
        <>
          {/* Input port — left edge */}
          <div
            onPointerDown={(e) => handlePortPointerDown(e, "left")}
            onPointerUp={handleBlockPointerUp}
            className={`absolute top-1/2 -translate-y-1/2 -left-3 w-6 h-6 rounded-full border-2 transition-all cursor-crosshair z-10 ${
              isDarkMode ? "bg-zinc-800 border-green-500" : "bg-white border-green-500"
            } ${hasPendingConnection ? "opacity-100 ring-2 ring-green-400 scale-125" : isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
            title="Drag to connect"
          />
          {/* Output port — right edge */}
          <div
            onPointerDown={(e) => handlePortPointerDown(e, "right")}
            onPointerUp={handleBlockPointerUp}
            className={`absolute top-1/2 -translate-y-1/2 -right-3 w-6 h-6 rounded-full border-2 transition-all cursor-crosshair z-10 ${
              isDarkMode ? "bg-zinc-800 border-blue-500" : "bg-white border-blue-500"
            } ${hasPendingConnection ? "opacity-100 ring-2 ring-blue-400 scale-125" : isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
            title="Drag to connect"
          />
        </>
      )}

      {/* Connection overlay when connect tool is active */}
      {!presentationMode && activeTool === "connect" && (
        <div
          className={`absolute inset-0 ${shapeStyles.className || "rounded-xl"} border-2 border-dashed pointer-events-none ${
            connectingFromId === block.id
              ? "border-purple-500 bg-purple-500/10"
              : "border-purple-300/50 hover:border-purple-400 hover:bg-purple-500/5"
          }`}
          style={isClipped ? { clipPath: shapeStyles.style.clipPath as string } : undefined}
        />
      )}

      {/* Resize handles — top-right + bottom-right */}
      {!presentationMode && <>
        <div
          onMouseDown={handleResizeMouseDown}
          className={`absolute -top-1 -right-1 ${isSelected ? "opacity-50" : "opacity-0 group-hover:opacity-50"} transition-opacity cursor-nesw-resize p-3 ${
            isDarkMode ? "text-zinc-600" : "text-slate-400"
          }`}
        >
          <svg width="12" height="12" viewBox="0 0 10 10" style={{ transform: "scaleX(-1)" }}>
            <path
              d="M9 1L1 9M9 5L5 9"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </div>
        <div
          onMouseDown={handleResizeMouseDown}
          className={`absolute -bottom-1 -right-1 ${isSelected ? "opacity-50" : "opacity-0 group-hover:opacity-50"} transition-opacity cursor-nwse-resize p-3 ${
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
      </>}
    </div>
  );
}
