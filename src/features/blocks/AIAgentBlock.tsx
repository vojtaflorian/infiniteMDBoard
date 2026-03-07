"use client";

import { useState, useRef, useEffect } from "react";
import { Play, Square, ChevronDown, ChevronRight, Loader2, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { useCanvasStore } from "@/stores/canvasStore";
import { useUIStore } from "@/stores/uiStore";
import { getBlockAlias } from "@/lib/execution/templateResolver";
import { getApiKeys } from "@/lib/apiKeyStore";
import { runSingleBlock } from "@/lib/execution/engine";
import type { AIConfig, AIProvider, Block } from "@/types";

interface AIAgentBlockProps {
  block: Block;
  isEditing: boolean;
}

const PROVIDER_MODELS: Record<AIProvider, string[]> = {
  openai: ["gpt-4o", "gpt-4o-mini", "gpt-4.1", "gpt-4.1-mini", "gpt-4.1-nano", "o3-mini", "o4-mini"],
  google: ["gemini-2.5-pro", "gemini-2.5-flash", "gemini-2.5-flash-lite", "gemini-2.0-flash"],
  anthropic: ["claude-sonnet-4-6", "claude-haiku-4-5-20251001"],
  custom: [],
};

type Section = "model" | "prompts" | "parameters" | "output" | "preview";

export function AIAgentBlock({ block, isEditing }: AIAgentBlockProps) {
  const updateBlock = useCanvasStore((s) => s.updateBlock);
  const blocks = useCanvasStore((s) => s.blocks);
  const { isDarkMode } = useUIStore();
  const config: AIConfig = block.aiConfig ?? {
    provider: "openai", model: "", apiKeyId: "", systemPrompt: "", userPrompt: "",
    temperature: 1, maxTokens: 4096, responseFormat: "text",
  };
  const alias = getBlockAlias(block);
  const [openSections, setOpenSections] = useState<Set<Section>>(new Set(["prompts"]));
  const [streamingText, setStreamingText] = useState("");
  const abortRef = useRef<AbortController | null>(null);

  const apiKeys = typeof window !== "undefined" ? getApiKeys() : [];
  const providerKeys = apiKeys.filter((k) => k.provider === config.provider);

  const toggleSection = (s: Section) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      next.has(s) ? next.delete(s) : next.add(s);
      return next;
    });
  };

  const updateConfig = (updates: Partial<AIConfig>) => {
    updateBlock(block.id, { aiConfig: { ...config, ...updates } });
  };

  const handleRun = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (block.executionState === "running") {
      abortRef.current?.abort();
      return;
    }
    setStreamingText("");
    abortRef.current = new AbortController();
    await runSingleBlock(block, blocks, setStreamingText, abortRef.current.signal);
  };

  useEffect(() => {
    if (block.executionState !== "running") {
      setStreamingText("");
    }
  }, [block.executionState]);

  const statusIcon = () => {
    switch (block.executionState) {
      case "running": return <Loader2 size={12} className="animate-spin text-blue-500" />;
      case "success": return <CheckCircle2 size={12} className="text-green-500" />;
      case "error": return <XCircle size={12} className="text-red-500" />;
      default: return <AlertCircle size={12} className={isDarkMode ? "text-zinc-600" : "text-slate-400"} />;
    }
  };

  const sectionHeader = (key: Section, label: string) => (
    <button
      onClick={(e) => { e.stopPropagation(); toggleSection(key); }}
      onMouseDown={(e) => e.stopPropagation()}
      className={`flex items-center gap-1 w-full text-[11px] font-semibold py-1 ${
        isDarkMode ? "text-zinc-400" : "text-slate-500"
      }`}
    >
      {openSections.has(key) ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
      {label}
    </button>
  );

  const inputClass = `w-full text-xs px-2 py-1 rounded border outline-none ${
    isDarkMode
      ? "bg-zinc-800 border-zinc-700 text-zinc-200 placeholder:text-zinc-600"
      : "bg-slate-50 border-slate-200 text-slate-700 placeholder:text-slate-400"
  }`;

  // --- COLLAPSED VIEW ---
  if (!isEditing) {
    return (
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
            isDarkMode ? "bg-blue-900/50 text-blue-400" : "bg-blue-100 text-blue-700"
          }`}>
            {`{{${alias}}}`}
          </span>
          <div className="flex items-center gap-1.5">
            {config.model && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                isDarkMode ? "bg-zinc-800 text-zinc-400" : "bg-slate-100 text-slate-500"
              }`}>
                {config.model}
              </span>
            )}
            {statusIcon()}
          </div>
        </div>
        {config.userPrompt && (
          <p className={`text-xs line-clamp-3 ${isDarkMode ? "text-zinc-400" : "text-slate-500"}`}>
            {config.userPrompt}
          </p>
        )}
        {block.executionOutput && (
          <p className={`text-[10px] ${isDarkMode ? "text-zinc-500" : "text-slate-400"}`}>
            Output: {(block.executionOutput.length / 1000).toFixed(1)}k chars
          </p>
        )}
        <button
          onClick={handleRun}
          onMouseDown={(e) => e.stopPropagation()}
          className={`w-full flex items-center justify-center gap-1 py-1 rounded text-xs font-medium transition-colors ${
            block.executionState === "running"
              ? "bg-red-500/20 text-red-400 hover:bg-red-500/30"
              : isDarkMode
                ? "bg-blue-600/20 text-blue-400 hover:bg-blue-600/30"
                : "bg-blue-100 text-blue-600 hover:bg-blue-200"
          }`}
        >
          {block.executionState === "running" ? <><Square size={12} /> Stop</> : <><Play size={12} /> Run</>}
        </button>
      </div>
    );
  }

  // --- EXPANDED VIEW (editing) ---
  return (
    <div className="space-y-1" onMouseDown={(e) => e.stopPropagation()}>
      {/* Alias */}
      <div className="flex items-center gap-2 mb-2">
        <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
          isDarkMode ? "bg-blue-900/50 text-blue-400" : "bg-blue-100 text-blue-700"
        }`}>
          {`{{${alias}}}`}
        </span>
        <input
          value={block.alias ?? ""}
          onChange={(e) => updateBlock(block.id, { alias: e.target.value || undefined })}
          placeholder="custom alias"
          className={`flex-1 text-[10px] font-mono px-2 py-0.5 rounded border outline-none ${
            isDarkMode ? "bg-zinc-800 border-zinc-700 text-zinc-400" : "bg-slate-50 border-slate-200 text-slate-500"
          }`}
        />
        {statusIcon()}
      </div>

      {/* Model Section */}
      {sectionHeader("model", "Model")}
      {openSections.has("model") && (
        <div className="space-y-1.5 pl-3 pb-2">
          <select value={config.provider} onChange={(e) => updateConfig({ provider: e.target.value as AIProvider, model: "" })} className={inputClass}>
            <option value="openai">OpenAI</option>
            <option value="google">Google (Gemini)</option>
            <option value="anthropic">Anthropic</option>
            <option value="custom">Custom (OpenAI-compatible)</option>
          </select>
          {config.provider === "custom" && (
            <input value={config.endpoint ?? ""} onChange={(e) => updateConfig({ endpoint: e.target.value })} placeholder="https://api.example.com/v1/chat/completions" className={inputClass} />
          )}
          {config.provider === "custom" ? (
            <input value={config.model} onChange={(e) => updateConfig({ model: e.target.value })} placeholder="model-name" className={inputClass} />
          ) : (
            <select value={config.model} onChange={(e) => updateConfig({ model: e.target.value })} className={inputClass}>
              <option value="">Select model...</option>
              {PROVIDER_MODELS[config.provider].map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          )}
          <select value={config.apiKeyId} onChange={(e) => updateConfig({ apiKeyId: e.target.value })} className={inputClass}>
            <option value="">Select API key...</option>
            {providerKeys.map((k) => <option key={k.id} value={k.id}>{k.label}</option>)}
          </select>
          {providerKeys.length === 0 && (
            <p className={`text-[10px] ${isDarkMode ? "text-yellow-500" : "text-yellow-600"}`}>
              No API keys for {config.provider}. Add one via the Key icon in toolbar.
            </p>
          )}
        </div>
      )}

      {/* Prompts Section */}
      {sectionHeader("prompts", "Prompts")}
      {openSections.has("prompts") && (
        <div className="space-y-1.5 pl-3 pb-2">
          <label className={`text-[10px] ${isDarkMode ? "text-zinc-500" : "text-slate-400"}`}>System prompt</label>
          <textarea
            value={config.systemPrompt}
            onChange={(e) => updateConfig({ systemPrompt: e.target.value })}
            placeholder="You are a helpful assistant..."
            className={`${inputClass} min-h-[40px] resize-y font-mono`}
            rows={2}
          />
          <label className={`text-[10px] ${isDarkMode ? "text-zinc-500" : "text-slate-400"}`}>User prompt</label>
          <textarea
            value={config.userPrompt}
            onChange={(e) => updateConfig({ userPrompt: e.target.value })}
            placeholder="Analyze {{input_1}} and..."
            className={`${inputClass} min-h-[60px] resize-y font-mono`}
            rows={4}
          />
        </div>
      )}

      {/* Parameters Section */}
      {sectionHeader("parameters", "Parameters")}
      {openSections.has("parameters") && (
        <div className="space-y-1.5 pl-3 pb-2">
          <div className="flex items-center gap-2">
            <label className={`text-[10px] w-20 shrink-0 ${isDarkMode ? "text-zinc-500" : "text-slate-400"}`}>Temperature</label>
            <input type="range" min="0" max="2" step="0.1" value={config.temperature} onChange={(e) => updateConfig({ temperature: parseFloat(e.target.value) })} className="flex-1" />
            <span className={`text-[10px] w-8 text-right ${isDarkMode ? "text-zinc-400" : "text-slate-500"}`}>{config.temperature}</span>
          </div>
          <div className="flex items-center gap-2">
            <label className={`text-[10px] w-20 shrink-0 ${isDarkMode ? "text-zinc-500" : "text-slate-400"}`}>Max tokens</label>
            <input type="number" value={config.maxTokens} onChange={(e) => updateConfig({ maxTokens: parseInt(e.target.value) || 4096 })} className={`${inputClass} flex-1`} />
          </div>
          <div className="flex items-center gap-2">
            <label className={`text-[10px] w-20 shrink-0 ${isDarkMode ? "text-zinc-500" : "text-slate-400"}`}>Top P</label>
            <input type="number" min="0" max="1" step="0.05" value={config.topP ?? ""} onChange={(e) => updateConfig({ topP: e.target.value ? parseFloat(e.target.value) : undefined })} placeholder="default" className={`${inputClass} flex-1`} />
          </div>
          <div className="flex items-center gap-2">
            <label className={`text-[10px] w-20 shrink-0 ${isDarkMode ? "text-zinc-500" : "text-slate-400"}`}>Top K</label>
            <input type="number" min="1" step="1" value={config.topK ?? ""} onChange={(e) => updateConfig({ topK: e.target.value ? parseInt(e.target.value) : undefined })} placeholder="default" className={`${inputClass} flex-1`} />
          </div>
        </div>
      )}

      {/* Output Format Section */}
      {sectionHeader("output", "Output Format")}
      {openSections.has("output") && (
        <div className="space-y-1.5 pl-3 pb-2">
          <div className="flex gap-1">
            {(["text", "json", "image"] as const).map((f) => (
              <button
                key={f}
                onClick={() => updateConfig({ responseFormat: f })}
                className={`text-[10px] px-2 py-0.5 rounded ${
                  config.responseFormat === f
                    ? isDarkMode ? "bg-blue-800 text-blue-200" : "bg-blue-200 text-blue-800"
                    : isDarkMode ? "text-zinc-500 hover:text-zinc-300" : "text-slate-400 hover:text-slate-600"
                }`}
              >
                {f.toUpperCase()}
              </button>
            ))}
          </div>
          {config.responseFormat === "image" && (
            <div className="flex items-center gap-2">
              <label className={`text-[10px] w-20 shrink-0 ${isDarkMode ? "text-zinc-500" : "text-slate-400"}`}>Size</label>
              <select value={config.imageSize ?? "1024x1024"} onChange={(e) => updateConfig({ imageSize: e.target.value })} className={inputClass}>
                <option value="256x256">256x256</option>
                <option value="512x512">512x512</option>
                <option value="1024x1024">1024x1024</option>
                <option value="1024x1792">1024x1792</option>
                <option value="1792x1024">1792x1024</option>
              </select>
            </div>
          )}
          {config.responseFormat === "json" && (
            <div className="space-y-1">
              <textarea
                placeholder='Paste example JSON to generate schema...'
                className={`${inputClass} min-h-[40px] resize-y font-mono`}
                rows={3}
                id={`schema-example-${block.id}`}
              />
              <div className="flex gap-1">
                <button
                  onClick={async () => {
                    const ta = document.getElementById(`schema-example-${block.id}`) as HTMLTextAreaElement;
                    if (!ta?.value.trim()) return;
                    const key = getApiKeys().find((k) => k.id === config.apiKeyId);
                    const res = await fetch("/api/ai/schema", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        exampleJson: ta.value,
                        apiKey: key?.key,
                        provider: config.provider,
                        model: config.model,
                      }),
                    });
                    if (res.ok) {
                      const data = await res.json();
                      updateConfig({ jsonSchema: data.schema });
                    }
                  }}
                  className={`text-[10px] px-2 py-0.5 rounded ${
                    isDarkMode ? "bg-purple-800 text-purple-200 hover:bg-purple-700" : "bg-purple-100 text-purple-700 hover:bg-purple-200"
                  }`}
                >
                  Generate Schema (AI)
                </button>
                <button
                  onClick={async () => {
                    const ta = document.getElementById(`schema-example-${block.id}`) as HTMLTextAreaElement;
                    if (!ta?.value.trim()) return;
                    const res = await fetch("/api/ai/schema", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ exampleJson: ta.value }),
                    });
                    if (res.ok) {
                      const data = await res.json();
                      updateConfig({ jsonSchema: data.schema });
                    }
                  }}
                  className={`text-[10px] px-2 py-0.5 rounded ${
                    isDarkMode ? "text-zinc-500 hover:text-zinc-300" : "text-slate-400 hover:text-slate-600"
                  }`}
                >
                  Infer
                </button>
              </div>
              {config.jsonSchema && (
                <pre className={`text-[10px] font-mono p-2 rounded max-h-[100px] overflow-auto ${
                  isDarkMode ? "bg-zinc-800 text-zinc-400" : "bg-slate-100 text-slate-600"
                }`}>
                  {JSON.stringify(config.jsonSchema, null, 2)}
                </pre>
              )}
            </div>
          )}
        </div>
      )}

      {/* Output Preview Section */}
      {sectionHeader("preview", "Output Preview")}
      {openSections.has("preview") && (
        <div className="pl-3 pb-2">
          {block.executionState === "running" && streamingText ? (
            <pre className={`text-xs font-mono whitespace-pre-wrap break-words max-h-[200px] overflow-auto ${
              isDarkMode ? "text-zinc-300" : "text-slate-700"
            }`}>
              {streamingText}
              <span className="animate-pulse">|</span>
            </pre>
          ) : block.executionState === "running" && config.responseFormat === "image" ? (
            <div className="flex items-center gap-2 py-4 justify-center">
              <Loader2 size={16} className="animate-spin text-blue-500" />
              <span className={`text-xs ${isDarkMode ? "text-zinc-400" : "text-slate-500"}`}>Generating image...</span>
            </div>
          ) : block.executionError ? (
            <div className="text-xs text-red-500 whitespace-pre-wrap">{block.executionError}</div>
          ) : block.executionOutput && config.responseFormat === "image" ? (
            <img src={block.executionOutput} alt="AI generated" className="max-w-full rounded max-h-[200px] object-contain" />
          ) : block.executionOutput ? (
            <pre className={`text-xs font-mono whitespace-pre-wrap break-words max-h-[200px] overflow-auto ${
              isDarkMode ? "text-zinc-300" : "text-slate-700"
            }`}>
              {block.executionOutput}
            </pre>
          ) : (
            <p className={`text-xs italic ${isDarkMode ? "text-zinc-600" : "text-slate-400"}`}>
              No output yet — click Run
            </p>
          )}
        </div>
      )}

      {/* Run button */}
      <button
        onClick={handleRun}
        className={`w-full flex items-center justify-center gap-1 py-1.5 rounded text-xs font-medium transition-colors ${
          block.executionState === "running"
            ? "bg-red-500/20 text-red-400 hover:bg-red-500/30"
            : isDarkMode
              ? "bg-blue-600/20 text-blue-400 hover:bg-blue-600/30"
              : "bg-blue-100 text-blue-600 hover:bg-blue-200"
        }`}
      >
        {block.executionState === "running" ? <><Square size={12} /> Stop</> : <><Play size={12} /> Run</>}
      </button>
    </div>
  );
}
