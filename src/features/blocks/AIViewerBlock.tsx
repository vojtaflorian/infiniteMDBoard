"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import { useCanvasStore } from "@/stores/canvasStore";
import { useUIStore } from "@/stores/uiStore";
import { findBlockByRef, getBlockAlias } from "@/lib/execution/templateResolver";
import type { Block, ViewerConfig } from "@/types";

interface AIViewerBlockProps {
  block: Block;
  isEditing: boolean;
  isExpanded?: boolean;
}

const RENDER_MODES = ["text", "json", "markdown", "html", "image"] as const;

function SourceRefInput({ value, onChange, blocks, currentBlockId, isDarkMode }: {
  value: string;
  onChange: (v: string) => void;
  blocks: Block[];
  currentBlockId: string;
  isDarkMode: boolean;
}) {
  const [showDropdown, setShowDropdown] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showDropdown) return;
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showDropdown]);

  const candidates = blocks
    .filter((b) => b.id !== currentBlockId && (b.type === "ai-agent" || b.type === "ai-input"))
    .map((b) => ({ alias: getBlockAlias(b), type: b.type, hasOutput: !!(b.executionOutput || (b.type === "ai-input" && b.content)) }));

  return (
    <div ref={wrapperRef} className="flex-1 relative">
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setShowDropdown(true)}
        onMouseDown={(e) => e.stopPropagation()}
        placeholder="{{block_alias}}"
        className={`w-full text-xs font-mono px-2 py-1 rounded border outline-none ${
          isDarkMode
            ? "bg-zinc-800 border-zinc-700 text-zinc-300 placeholder:text-zinc-600"
            : "bg-slate-50 border-slate-200 text-slate-700 placeholder:text-slate-400"
        }`}
      />
      {showDropdown && candidates.length > 0 && (
        <div
          className={`absolute top-full left-0 right-0 mt-1 z-20 rounded-lg border shadow-lg max-h-[150px] overflow-auto ${
            isDarkMode ? "bg-zinc-800 border-zinc-700" : "bg-white border-slate-200"
          }`}
          onMouseDown={(e) => e.stopPropagation()}
        >
          {candidates.map((c) => (
            <button
              key={c.alias}
              onClick={() => { onChange(`{{${c.alias}}}`); setShowDropdown(false); }}
              className={`w-full text-left px-2 py-1.5 text-xs flex items-center gap-2 ${
                isDarkMode ? "hover:bg-zinc-700 text-zinc-300" : "hover:bg-slate-100 text-slate-700"
              }`}
            >
              <span className={`font-mono ${isDarkMode ? "text-blue-400" : "text-blue-600"}`}>{`{{${c.alias}}}`}</span>
              <span className={`text-[10px] ${isDarkMode ? "text-zinc-500" : "text-slate-400"}`}>
                {c.type === "ai-agent" ? "agent" : "input"}
              </span>
              {c.hasOutput && (
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 ml-auto" title="Has output" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function AIViewerBlock({ block, isEditing, isExpanded }: AIViewerBlockProps) {
  const showExpanded = isEditing || isExpanded;
  const updateBlock = useCanvasStore((s) => s.updateBlock);
  const blocks = useCanvasStore((s) => s.blocks);
  const { isDarkMode } = useUIStore();
  const config: ViewerConfig = block.viewerConfig ?? { renderMode: "text" };

  // Resolve source ref to get content
  const sourceContent = useMemo(() => {
    if (!config.sourceRef) return "";
    const refMatch = config.sourceRef.match(/^\{\{(.+?)\}\}$/);
    const ref = refMatch ? refMatch[1] : config.sourceRef;
    const sourceBlock = findBlockByRef(ref, blocks);
    if (!sourceBlock) return "";
    if (sourceBlock.type === "ai-input") return sourceBlock.content;
    return sourceBlock.executionOutput ?? "";
  }, [config.sourceRef, blocks]);

  const renderContent = () => {
    if (!sourceContent) {
      return (
        <div className={`text-sm italic ${isDarkMode ? "text-zinc-600" : "text-slate-400"}`}>
          {config.sourceRef ? "Waiting for source block output..." : "Set source reference to display output"}
        </div>
      );
    }

    switch (config.renderMode) {
      case "json": {
        try {
          const parsed = JSON.parse(sourceContent);
          return (
            <pre className={`text-xs font-mono whitespace-pre-wrap break-words overflow-auto ${
              isDarkMode ? "text-zinc-300" : "text-slate-700"
            }`}>
              {JSON.stringify(parsed, null, 2)}
            </pre>
          );
        } catch {
          return <pre className="text-xs font-mono text-red-500 whitespace-pre-wrap">{sourceContent}</pre>;
        }
      }
      case "markdown":
        return (
          <div className={`prose prose-sm max-w-none ${isDarkMode ? "prose-invert" : ""}`}>
            <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>
              {sourceContent}
            </ReactMarkdown>
          </div>
        );
      case "html":
        return (
          <iframe
            srcDoc={`<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{font-family:system-ui,sans-serif;font-size:14px;margin:12px;color:${isDarkMode ? "#d4d4d8" : "#334155"};background:${isDarkMode ? "#18181b" : "#ffffff"}}</style></head><body>${sourceContent}</body></html>`}
            className="w-full h-full min-h-[200px] border-0 rounded"
            sandbox="allow-same-origin"
            title="HTML output"
          />
        );
      case "image":
        return (
          <img
            src={sourceContent}
            alt="AI generated output"
            className="max-w-full rounded"
          />
        );
      default:
        return (
          <pre className={`text-sm font-mono whitespace-pre-wrap break-words ${
            isDarkMode ? "text-zinc-300" : "text-slate-700"
          }`}>
            {sourceContent}
          </pre>
        );
    }
  };

  return (
    <div className="space-y-2">
      {/* Controls */}
      <div className="flex items-center justify-between gap-2">
        {showExpanded ? (
          <SourceRefInput
            value={config.sourceRef ?? ""}
            onChange={(v) => updateBlock(block.id, { viewerConfig: { ...config, sourceRef: v } })}
            blocks={blocks}
            currentBlockId={block.id}
            isDarkMode={isDarkMode}
          />
        ) : (
          <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
            isDarkMode ? "bg-purple-900/50 text-purple-400" : "bg-purple-100 text-purple-700"
          }`}>
            {config.sourceRef || "no source"}
          </span>
        )}

        <div className="flex gap-1 shrink-0">
          {RENDER_MODES.map((mode) => (
            <button
              key={mode}
              onClick={(e) => { e.stopPropagation(); updateBlock(block.id, { viewerConfig: { ...config, renderMode: mode } }); }}
              onMouseDown={(e) => e.stopPropagation()}
              className={`text-[10px] px-1.5 py-0.5 rounded transition-colors ${
                config.renderMode === mode
                  ? isDarkMode ? "bg-purple-800 text-purple-200" : "bg-purple-200 text-purple-800"
                  : isDarkMode ? "text-zinc-500 hover:text-zinc-300" : "text-slate-400 hover:text-slate-600"
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      {/* Content display */}
      <div className="overflow-auto max-h-[500px]">
        {renderContent()}
      </div>
    </div>
  );
}
