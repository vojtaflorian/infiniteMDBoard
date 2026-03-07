"use client";

import { useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import { useCanvasStore } from "@/stores/canvasStore";
import { useUIStore } from "@/stores/uiStore";
import { findBlockByRef } from "@/lib/execution/templateResolver";
import type { Block, ViewerConfig } from "@/types";

interface AIViewerBlockProps {
  block: Block;
  isEditing: boolean;
}

const RENDER_MODES = ["text", "json", "markdown", "html", "image"] as const;

export function AIViewerBlock({ block, isEditing }: AIViewerBlockProps) {
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
        {isEditing ? (
          <input
            value={config.sourceRef ?? ""}
            onChange={(e) => updateBlock(block.id, { viewerConfig: { ...config, sourceRef: e.target.value } })}
            onMouseDown={(e) => e.stopPropagation()}
            placeholder="{{block_alias}}"
            className={`flex-1 text-xs font-mono px-2 py-1 rounded border outline-none ${
              isDarkMode
                ? "bg-zinc-800 border-zinc-700 text-zinc-300 placeholder:text-zinc-600"
                : "bg-slate-50 border-slate-200 text-slate-700 placeholder:text-slate-400"
            }`}
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
