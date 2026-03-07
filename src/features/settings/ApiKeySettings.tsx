"use client";

import { useState, useEffect } from "react";
import { X, Plus, Trash2, Eye, EyeOff } from "lucide-react";
import { useUIStore } from "@/stores/uiStore";
import { getApiKeys, addApiKey, deleteApiKey } from "@/lib/apiKeyStore";
import type { AIProvider, StoredApiKey } from "@/types";

interface ApiKeySettingsProps {
  open: boolean;
  onClose: () => void;
}

export function ApiKeySettings({ open, onClose }: ApiKeySettingsProps) {
  const { isDarkMode } = useUIStore();
  const [keys, setKeys] = useState<StoredApiKey[]>([]);
  const [newLabel, setNewLabel] = useState("");
  const [newProvider, setNewProvider] = useState<AIProvider>("openai");
  const [newKey, setNewKey] = useState("");
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (open) setKeys(getApiKeys());
  }, [open]);

  if (!open) return null;

  const handleAdd = () => {
    if (!newLabel.trim() || !newKey.trim()) return;
    const added = addApiKey(newLabel.trim(), newProvider, newKey.trim());
    setKeys((prev) => [...prev, added]);
    setNewLabel("");
    setNewKey("");
  };

  const handleDelete = (id: string) => {
    deleteApiKey(id);
    setKeys((prev) => prev.filter((k) => k.id !== id));
  };

  const toggleVisible = (id: string) => {
    setVisibleKeys((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div
        className={`w-[480px] max-h-[80vh] rounded-2xl border shadow-2xl overflow-hidden ${
          isDarkMode ? "bg-zinc-900 border-zinc-700" : "bg-white border-slate-200"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`flex items-center justify-between px-4 py-3 border-b ${isDarkMode ? "border-zinc-700" : "border-slate-200"}`}>
          <h2 className={`text-sm font-semibold ${isDarkMode ? "text-zinc-200" : "text-slate-800"}`}>API Keys</h2>
          <button onClick={onClose} className={`p-1 rounded-lg ${isDarkMode ? "hover:bg-zinc-800 text-zinc-400" : "hover:bg-slate-100 text-slate-500"}`}>
            <X size={16} />
          </button>
        </div>

        <div className="p-4 space-y-2 overflow-y-auto max-h-[40vh]">
          {keys.length === 0 && (
            <p className={`text-sm ${isDarkMode ? "text-zinc-500" : "text-slate-400"}`}>No API keys stored yet.</p>
          )}
          {keys.map((k) => (
            <div key={k.id} className={`flex items-center gap-2 p-2 rounded-lg ${isDarkMode ? "bg-zinc-800" : "bg-slate-50"}`}>
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${isDarkMode ? "bg-zinc-700 text-zinc-400" : "bg-slate-200 text-slate-600"}`}>
                {k.provider}
              </span>
              <span className={`text-sm flex-1 ${isDarkMode ? "text-zinc-300" : "text-slate-700"}`}>{k.label}</span>
              <span className={`text-xs font-mono ${isDarkMode ? "text-zinc-500" : "text-slate-400"}`}>
                {visibleKeys.has(k.id) ? k.key : `${k.key.slice(0, 8)}...`}
              </span>
              <button onClick={() => toggleVisible(k.id)} className={`p-1 rounded ${isDarkMode ? "text-zinc-500 hover:text-zinc-300" : "text-slate-400 hover:text-slate-600"}`}>
                {visibleKeys.has(k.id) ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
              <button onClick={() => handleDelete(k.id)} className="p-1 rounded text-red-500 hover:text-red-400">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>

        <div className={`p-4 border-t space-y-2 ${isDarkMode ? "border-zinc-700" : "border-slate-200"}`}>
          <div className="flex gap-2">
            <select
              value={newProvider}
              onChange={(e) => setNewProvider(e.target.value as AIProvider)}
              className={`text-xs px-2 py-1.5 rounded border ${isDarkMode ? "bg-zinc-800 border-zinc-700 text-zinc-300" : "bg-white border-slate-200 text-slate-700"}`}
            >
              <option value="openai">OpenAI</option>
              <option value="google">Google</option>
              <option value="anthropic">Anthropic</option>
              <option value="custom">Custom</option>
            </select>
            <input
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              placeholder="Label (e.g. My GPT key)"
              className={`flex-1 text-xs px-2 py-1.5 rounded border outline-none ${isDarkMode ? "bg-zinc-800 border-zinc-700 text-zinc-300" : "bg-white border-slate-200 text-slate-700"}`}
            />
          </div>
          <div className="flex gap-2">
            <input
              value={newKey}
              onChange={(e) => setNewKey(e.target.value)}
              placeholder="API key"
              type="password"
              className={`flex-1 text-xs font-mono px-2 py-1.5 rounded border outline-none ${isDarkMode ? "bg-zinc-800 border-zinc-700 text-zinc-300" : "bg-white border-slate-200 text-slate-700"}`}
            />
            <button
              onClick={handleAdd}
              disabled={!newLabel.trim() || !newKey.trim()}
              className={`flex items-center gap-1 text-xs px-3 py-1.5 rounded font-medium transition-colors ${
                newLabel.trim() && newKey.trim()
                  ? isDarkMode ? "bg-blue-600 text-white hover:bg-blue-500" : "bg-blue-500 text-white hover:bg-blue-600"
                  : isDarkMode ? "bg-zinc-800 text-zinc-600" : "bg-slate-100 text-slate-400"
              }`}
            >
              <Plus size={12} /> Add
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
