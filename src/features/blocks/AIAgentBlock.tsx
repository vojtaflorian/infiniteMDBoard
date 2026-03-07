"use client";

import { useState, useRef, useEffect } from "react";
import { Play, Square, ChevronDown, ChevronRight, Loader2, CheckCircle2, XCircle, AlertCircle, Copy, PlayCircle } from "lucide-react";
import { useCanvasStore } from "@/stores/canvasStore";
import { useUIStore } from "@/stores/uiStore";
import { getBlockAlias } from "@/lib/execution/templateResolver";
import { getApiKeys } from "@/lib/apiKeyStore";
import { getDefaultAIConfig } from "@/lib/execution/aiDefaults";
import { runSingleBlock, runPipeline } from "@/lib/execution/engine";
import { TemplatePreviewOverlay } from "./TemplatePreviewOverlay";
import type { AIConfig, AIProvider, Block } from "@/types";

interface AIAgentBlockProps {
  block: Block;
  isEditing: boolean;
  isExpanded?: boolean;
}

const PROVIDER_MODEL_HINTS: Record<AIProvider, string[]> = {
  openai: ["gpt-4o", "gpt-4o-mini", "gpt-4.1", "gpt-4.1-mini", "gpt-4.1-nano", "o3-mini", "o4-mini"],
  google: ["gemini-2.5-pro", "gemini-2.5-flash", "gemini-2.5-flash-lite", "gemini-2.0-flash"],
  anthropic: ["claude-sonnet-4-6", "claude-haiku-4-5-20251001"],
  custom: [],
};

const TEMP_MAX: Record<AIProvider, number> = { openai: 2, google: 2, anthropic: 1, custom: 2 };

const LAST_MODEL_KEY = "ai-last-model";

function getLastModel(provider: AIProvider): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(`${LAST_MODEL_KEY}-${provider}`) ?? "";
}

function saveLastModel(provider: AIProvider, model: string) {
  if (typeof window === "undefined" || !model) return;
  localStorage.setItem(`${LAST_MODEL_KEY}-${provider}`, model);
}

type Section = "model" | "prompts" | "parameters" | "output" | "preview";

export function AIAgentBlock({ block, isEditing, isExpanded }: AIAgentBlockProps) {
  const showExpanded = isEditing || isExpanded;
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
  const schemaTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const userPromptRef = useRef<HTMLTextAreaElement | null>(null);
  const [copied, setCopied] = useState(false);

  const copyAlias = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(`{{${alias}}}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  const apiKeys = typeof window !== "undefined" ? getApiKeys() : [];
  const providerKeys = apiKeys.filter((k) => k.provider === config.provider);

  // Auto-select API key and model when empty
  useEffect(() => {
    if (config.apiKeyId === "" && providerKeys.length > 0) {
      const defaults = getDefaultAIConfig(config.provider);
      updateConfig({
        apiKeyId: defaults.apiKeyId,
        ...(config.model === "" ? { model: defaults.model } : {}),
      });
    }
  }, [config.provider]); // Only re-run when provider changes

  // Auto-rename title based on alias
  useEffect(() => {
    if (block.alias && block.alias !== block.title) {
      updateBlock(block.id, { title: block.alias });
    }
  }, [block.alias]);

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

  const handleRunPipeline = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (block.executionState === "running") return;
    abortRef.current = new AbortController();
    await runPipeline(block.id, undefined, undefined, abortRef.current.signal);
  };

  const handleCopyOutput = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (block.executionOutput) {
      navigator.clipboard.writeText(block.executionOutput);
    }
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
  if (!showExpanded) {
    const PROVIDER_COLORS: Record<string, string> = { openai: "bg-emerald-500", google: "bg-amber-500", anthropic: "bg-orange-700", custom: "bg-zinc-500" };
    const promptPreview = (config.userPrompt || config.systemPrompt || "").split("\n")[0].slice(0, 60);
    return (
      <div className="space-y-1">
        <div className="flex items-center gap-2 min-h-[24px]">
          <span className={`w-2 h-2 rounded-full shrink-0 ${PROVIDER_COLORS[config.provider] ?? "bg-zinc-500"}`} title={config.provider} />
          {config.model && (
            <span className={`text-xs font-medium shrink-0 ${isDarkMode ? "text-zinc-300" : "text-slate-600"}`}>
              {config.model}
            </span>
          )}
          {promptPreview && (
            <span className={`text-xs truncate ${isDarkMode ? "text-zinc-500" : "text-slate-400"}`}>
              {promptPreview}
            </span>
          )}
          <span className="ml-auto shrink-0">
            {block.executionState === "running"
              ? <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse inline-block" />
              : block.executionState === "success"
                ? <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
                : block.executionState === "error"
                  ? <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
                  : null}
          </span>
        </div>
        {block.executionOutput && (
          <div className={`text-xs ${isDarkMode ? "text-zinc-600" : "text-slate-400"}`}>
            {(block.executionOutput.length / 1000).toFixed(1)}k chars
            {block.executionTokens && ` · ${block.executionTokens.input + block.executionTokens.output} tok`}
          </div>
        )}
      </div>
    );
  }

  // --- EXPANDED VIEW (editing) ---
  return (
    <div className="space-y-1" onMouseDown={(e) => e.stopPropagation()}>
      {/* Alias */}
      <div className="flex items-center gap-2 mb-2">
        <button
          onClick={copyAlias}
          className={`text-xs font-mono px-1.5 py-0.5 rounded cursor-copy transition-colors ${
            copied
              ? "bg-green-600/30 text-green-400"
              : isDarkMode ? "bg-blue-900/50 text-blue-400 hover:bg-blue-900/70" : "bg-blue-100 text-blue-700 hover:bg-blue-200"
          }`}
          title="Click to copy reference"
        >
          {copied ? "Copied!" : `{{${alias}}}`}
        </button>
        <input
          value={block.alias ?? ""}
          onChange={(e) => updateBlock(block.id, { alias: e.target.value || undefined })}
          placeholder="custom alias"
          className={`flex-1 text-xs font-mono px-2 py-0.5 rounded border outline-none ${
            isDarkMode ? "bg-zinc-800 border-zinc-700 text-zinc-400" : "bg-slate-50 border-slate-200 text-slate-500"
          }`}
        />
        {statusIcon()}
      </div>

      {/* Model Section */}
      {sectionHeader("model", "Model")}
      {openSections.has("model") && (
        <div className="space-y-1.5 pl-3 pb-2">
          <select value={config.provider} onChange={(e) => {
            const p = e.target.value as AIProvider;
            const defaults = getDefaultAIConfig(p);
            updateConfig({ provider: p, model: defaults.model || getLastModel(p), apiKeyId: defaults.apiKeyId });
          }} className={inputClass}>
            <option value="openai">OpenAI</option>
            <option value="google">Google (Gemini)</option>
            <option value="anthropic">Anthropic</option>
            <option value="custom">Custom (OpenAI-compatible)</option>
          </select>
          {config.provider === "custom" && (
            <input value={config.endpoint ?? ""} onChange={(e) => updateConfig({ endpoint: e.target.value })} placeholder="https://api.example.com/v1/chat/completions" className={inputClass} />
          )}
          <input
            list={`models-${block.id}`}
            value={config.model}
            onChange={(e) => { updateConfig({ model: e.target.value }); saveLastModel(config.provider, e.target.value); }}
            placeholder={PROVIDER_MODEL_HINTS[config.provider][0] ?? "model-name"}
            className={inputClass}
          />
          <datalist id={`models-${block.id}`}>
            {PROVIDER_MODEL_HINTS[config.provider].map((m) => <option key={m} value={m} />)}
          </datalist>
          <select value={config.apiKeyId} onChange={(e) => updateConfig({ apiKeyId: e.target.value })} className={inputClass}>
            <option value="">Select API key...</option>
            {providerKeys.map((k) => <option key={k.id} value={k.id}>{k.label}</option>)}
          </select>
          {providerKeys.length === 0 && (
            <button
              onClick={() => useUIStore.getState().setApiKeySettingsOpen(true)}
              className={`text-xs text-left underline ${isDarkMode ? "text-yellow-500 hover:text-yellow-400" : "text-yellow-600 hover:text-yellow-500"}`}
            >
              No API keys for {config.provider}. Click to add one.
            </button>
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
          <div className="relative">
            <textarea
              ref={userPromptRef}
              value={config.userPrompt}
              onChange={(e) => updateConfig({ userPrompt: e.target.value })}
              placeholder="Analyze {{input_1}} and..."
              className={`${inputClass} min-h-[60px] resize-y font-mono`}
              rows={4}
            />
            <TemplatePreviewOverlay textareaRef={userPromptRef} />
          </div>
        </div>
      )}

      {/* Parameters Section */}
      {sectionHeader("parameters", "Parameters")}
      {openSections.has("parameters") && (
        <div className="space-y-1.5 pl-3 pb-2">
          <div className="flex items-center gap-2">
            <label className={`text-[10px] w-20 shrink-0 ${isDarkMode ? "text-zinc-500" : "text-slate-400"}`}>Temperature</label>
            <input type="range" min="0" max={TEMP_MAX[config.provider]} step="0.1" value={Math.min(config.temperature, TEMP_MAX[config.provider])} onChange={(e) => updateConfig({ temperature: parseFloat(e.target.value) })} className="flex-1" />
            <span className={`text-xs w-8 text-right ${isDarkMode ? "text-zinc-400" : "text-slate-500"}`}>{config.temperature}</span>
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
                className={`text-xs px-2 py-0.5 rounded ${
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
                ref={schemaTextareaRef}
              />
              <div className="flex gap-1">
                <button
                  onClick={async () => {
                    if (!schemaTextareaRef.current?.value.trim()) return;
                    const ta = schemaTextareaRef.current;
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
                  className={`text-xs px-2 py-0.5 rounded ${
                    isDarkMode ? "bg-purple-800 text-purple-200 hover:bg-purple-700" : "bg-purple-100 text-purple-700 hover:bg-purple-200"
                  }`}
                >
                  Generate Schema (AI)
                </button>
                <button
                  onClick={async () => {
                    if (!schemaTextareaRef.current?.value.trim()) return;
                    const ta = schemaTextareaRef.current;
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
                  className={`text-xs px-2 py-0.5 rounded ${
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
        <div className="pl-3 pb-2 relative">
          {block.executionOutput && (
            <button
              onClick={handleCopyOutput}
              className={`absolute top-0 right-0 p-1 rounded ${
                isDarkMode ? "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-700" : "text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              }`}
              title="Copy output"
            >
              <Copy size={12} />
            </button>
          )}
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
          {block.executionTokens && (
            <div className={`mt-1 text-xs font-mono ${isDarkMode ? "text-zinc-500" : "text-slate-400"}`}>
              ↑{block.executionTokens.input} ↓{block.executionTokens.output} tokens ({block.executionTokens.input + block.executionTokens.output} total)
            </div>
          )}
        </div>
      )}

      {/* Run buttons */}
      <div className="flex gap-1">
        <button
          onClick={handleRun}
          className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded text-xs font-medium transition-colors ${
            block.executionState === "running"
              ? "bg-red-500/20 text-red-400 hover:bg-red-500/30"
              : isDarkMode
                ? "bg-blue-600/20 text-blue-400 hover:bg-blue-600/30"
                : "bg-blue-100 text-blue-600 hover:bg-blue-200"
          }`}
        >
          {block.executionState === "running" ? <><Square size={12} /> Stop</> : <><Play size={12} /> Run</>}
        </button>
        <button
          onClick={handleRunPipeline}
          onMouseDown={(e) => e.stopPropagation()}
          className={`flex items-center gap-1 px-2 py-1.5 rounded text-xs font-medium transition-colors ${
            isDarkMode
              ? "bg-purple-600/20 text-purple-400 hover:bg-purple-600/30"
              : "bg-purple-100 text-purple-600 hover:bg-purple-200"
          }`}
          title="Run pipeline from this block"
        >
          <PlayCircle size={12} /> Pipeline
        </button>
      </div>
    </div>
  );
}
