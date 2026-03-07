"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Upload, FileText, X } from "lucide-react";
import { useCanvasStore } from "@/stores/canvasStore";
import { useUIStore } from "@/stores/uiStore";
import { getBlockAlias } from "@/lib/execution/templateResolver";
import type { Block, InputConfig } from "@/types";

interface AIInputBlockProps {
  block: Block;
  isEditing: boolean;
  isExpanded?: boolean;
}

const TEXT_EXTENSIONS = [".txt", ".md", ".csv", ".json", ".xml", ".html", ".css", ".js", ".ts"];
const IMAGE_TYPES = ["image/png", "image/jpeg", "image/gif", "image/webp"];

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function AIInputBlock({ block, isEditing, isExpanded }: AIInputBlockProps) {
  const showExpanded = isEditing || isExpanded;
  const updateBlock = useCanvasStore((s) => s.updateBlock);
  const { isDarkMode } = useUIStore();
  const config: InputConfig = block.inputConfig ?? { format: "text" };
  const alias = getBlockAlias(block);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [jsonValid, setJsonValid] = useState<boolean | null>(null);
  const [dragOver, setDragOver] = useState(false);

  // Auto-rename title based on alias or file name
  useEffect(() => {
    if (block.alias) {
      if (block.alias !== block.title) updateBlock(block.id, { title: block.alias });
    } else if (config.fileName && config.fileName !== block.title) {
      updateBlock(block.id, { title: config.fileName });
    }
  }, [block.alias, config.fileName]);

  const handleContentChange = (value: string) => {
    updateBlock(block.id, { content: value });
    if (config.format === "json") {
      try { JSON.parse(value); setJsonValid(true); }
      catch { setJsonValid(value.trim() === "" ? null : false); }
    }
  };

  const handleFormatToggle = (format: InputConfig["format"]) => {
    updateBlock(block.id, {
      inputConfig: { ...config, format, fileName: undefined, fileType: undefined, fileSize: undefined },
      content: format === "file" ? "" : block.content,
    });
    setJsonValid(null);
  };

  const processFile = useCallback(async (file: File) => {
    const isTextFile = TEXT_EXTENSIONS.some((ext) => file.name.toLowerCase().endsWith(ext)) || file.type.startsWith("text/");
    const isImage = IMAGE_TYPES.includes(file.type);
    const isPdf = file.type === "application/pdf";

    let content = "";

    if (isTextFile) {
      content = await file.text();
    } else if (isImage) {
      content = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
    } else if (isPdf) {
      const formData = new FormData();
      formData.append("file", file);
      try {
        const res = await fetch("/api/ai/extract-pdf", { method: "POST", body: formData });
        if (res.ok) {
          const data = await res.json();
          content = data.text ?? "";
        } else {
          content = `[PDF extraction failed: ${res.status}]`;
        }
      } catch (err) {
        content = `[PDF extraction error: ${err}]`;
      }
    } else {
      content = await file.text();
    }

    updateBlock(block.id, {
      content,
      inputConfig: {
        ...config,
        format: "file",
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
      },
    });
  }, [block.id, config, updateBlock]);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = "";
  };

  const clearFile = () => {
    updateBlock(block.id, {
      content: "",
      inputConfig: { ...config, fileName: undefined, fileType: undefined, fileSize: undefined },
    });
  };

  return (
    <div className="space-y-2">
      {/* Header */}
      {showExpanded && (
        <div className="flex items-center justify-between">
          <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
            isDarkMode ? "bg-green-900/50 text-green-400" : "bg-green-100 text-green-700"
          }`}>
            {`{{${alias}}}`}
          </span>
          <div className="flex gap-1">
            {(["text", "json", "file"] as const).map((f) => (
              <button
                key={f}
                onClick={(e) => { e.stopPropagation(); handleFormatToggle(f); }}
                onMouseDown={(e) => e.stopPropagation()}
                className={`text-[10px] px-2 py-0.5 rounded transition-colors ${
                  config.format === f
                    ? isDarkMode ? "bg-green-800 text-green-200" : "bg-green-200 text-green-800"
                    : isDarkMode ? "text-zinc-500 hover:text-zinc-300" : "text-slate-400 hover:text-slate-600"
                }`}
              >
                {f.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* File mode */}
      {config.format === "file" ? (
        config.fileName ? (
          <div className={`flex items-center gap-2 p-2 rounded-lg ${isDarkMode ? "bg-zinc-800" : "bg-slate-50"}`}>
            <FileText size={14} className={isDarkMode ? "text-zinc-400" : "text-slate-500"} />
            <div className="flex-1 min-w-0">
              <div className={`text-xs font-medium truncate ${isDarkMode ? "text-zinc-300" : "text-slate-700"}`}>{config.fileName}</div>
              <div className={`text-[10px] ${isDarkMode ? "text-zinc-500" : "text-slate-400"}`}>
                {config.fileType} · {formatFileSize(config.fileSize ?? 0)}
                {config.fileType?.startsWith("image/") && " · image data URL"}
              </div>
            </div>
            {showExpanded && (
              <button onClick={(e) => { e.stopPropagation(); clearFile(); }} onMouseDown={(e) => e.stopPropagation()}
                className="p-1 rounded text-red-500 hover:text-red-400"><X size={12} /></button>
            )}
            {config.fileType?.startsWith("image/") && block.content && (
              <img src={block.content} alt={config.fileName} className="w-12 h-12 object-cover rounded" />
            )}
          </div>
        ) : showExpanded ? (
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
            className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 border-dashed cursor-pointer transition-colors ${
              dragOver
                ? isDarkMode ? "border-green-500 bg-green-900/20" : "border-green-400 bg-green-50"
                : isDarkMode ? "border-zinc-700 hover:border-zinc-600" : "border-slate-300 hover:border-slate-400"
            }`}
          >
            <Upload size={20} className={isDarkMode ? "text-zinc-500" : "text-slate-400"} />
            <span className={`text-xs ${isDarkMode ? "text-zinc-500" : "text-slate-400"}`}>
              Drop file or click to upload
            </span>
            <span className={`text-[10px] ${isDarkMode ? "text-zinc-600" : "text-slate-400"}`}>
              Images, text, PDF, CSV...
            </span>
            <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileSelect}
              accept=".txt,.md,.csv,.json,.xml,.html,.pdf,.png,.jpg,.jpeg,.gif,.webp" />
          </div>
        ) : (
          <span className={`text-sm italic ${isDarkMode ? "text-zinc-600" : "text-slate-400"}`}>No file — click to edit</span>
        )
      ) : showExpanded ? (
        /* Text/JSON mode */
        <div className="relative">
          <textarea
            value={block.content}
            onChange={(e) => handleContentChange(e.target.value)}
            onMouseDown={(e) => e.stopPropagation()}
            placeholder={config.format === "json" ? '{"key": "value"}' : "Enter input data..."}
            className={`w-full min-h-[80px] text-sm font-mono p-2 rounded-lg border outline-none resize-y ${
              isDarkMode
                ? "bg-zinc-800 border-zinc-700 text-zinc-200 placeholder:text-zinc-600"
                : "bg-slate-50 border-slate-200 text-slate-800 placeholder:text-slate-400"
            }`}
            rows={5}
          />
          {config.format === "json" && jsonValid !== null && (
            <div className={`absolute top-2 right-2 w-2 h-2 rounded-full ${
              jsonValid ? "bg-green-500" : "bg-red-500"
            }`} title={jsonValid ? "Valid JSON" : "Invalid JSON"} />
          )}
        </div>
      ) : (
        <div className="flex items-center gap-2 min-h-[24px]">
          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded shrink-0 ${
            isDarkMode ? "bg-green-900/50 text-green-400" : "bg-green-100 text-green-700"
          }`}>
            {config.format.toUpperCase()}
          </span>
          <span className={`text-[11px] truncate ${isDarkMode ? "text-zinc-400" : "text-slate-500"}`}>
            {config.fileName || block.content?.split("\n")[0]?.slice(0, 60) || "No data"}
          </span>
          {block.content && <span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0 ml-auto" />}
        </div>
      )}

      {/* URL info badge */}
      {config.format !== "file" && /^https?:\/\/\S+$/i.test(block.content.trim()) && (
        <div className={`flex items-center gap-1.5 text-[10px] px-2 py-1 rounded-md ${
          isDarkMode ? "bg-blue-900/30 text-blue-400" : "bg-blue-50 text-blue-600"
        }`}>
          <span>🔗</span>
          <span>URL — model will fetch content if supported</span>
        </div>
      )}
    </div>
  );
}
