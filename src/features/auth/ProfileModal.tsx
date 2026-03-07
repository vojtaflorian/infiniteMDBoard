"use client";

import { useState, useEffect } from "react";
import { useAuthStore } from "@/stores/authStore";
import { useUIStore } from "@/stores/uiStore";
import { geminiKeySchema } from "@/lib/validation";
import { X, Key, Eye, EyeOff, Trash2, Plus } from "lucide-react";
import { getApiKeys, addApiKey, deleteApiKey } from "@/lib/apiKeyStore";
import type { AIProvider, StoredApiKey } from "@/types";

interface ProfileModalProps {
  open: boolean;
  onClose: () => void;
  inline?: boolean;
}

export function ProfileModal({ open, onClose, inline }: ProfileModalProps) {
  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);
  const isDarkMode = useUIStore((s) => s.isDarkMode);
  const profileTab = useUIStore((s) => s.profileTab);
  const setProfileTab = useUIStore((s) => s.setProfileTab);

  const [apiKey, setApiKey] = useState("");
  const [maskedKey, setMaskedKey] = useState<string | null>(null);
  const [hasKey, setHasKey] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // API Keys tab state
  const [workflowKeys, setWorkflowKeys] = useState<StoredApiKey[]>([]);
  const [newLabel, setNewLabel] = useState("");
  const [newProvider, setNewProvider] = useState<AIProvider>("openai");
  const [newKey, setNewKey] = useState("");
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (open && user) {
      fetch("/api/profile")
        .then((r) => r.json())
        .then((data) => {
          setHasKey(data.hasKey);
          setMaskedKey(data.maskedKey);
        })
        .catch(() => {});
    }
  }, [open, user]);

  useEffect(() => {
    if (open) setWorkflowKeys(getApiKeys());
  }, [open]);

  if (!open || !user) return null;

  const handleSave = async () => {
    setError(null);
    setSuccess(null);
    const parsed = geminiKeySchema.safeParse(apiKey);
    if (!parsed.success) {
      setError("Invalid API key format.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ geminiApiKey: parsed.data }),
      });
      if (res.ok) {
        setHasKey(true);
        setMaskedKey(parsed.data.slice(0, 4) + "..." + "****");
        setApiKey("");
        setSuccess("API key saved.");
      } else {
        const data = await res.json();
        setError(data.error || "Failed to save.");
      }
    } catch {
      setError("Network error.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/profile", { method: "DELETE" });
      if (res.ok) {
        setHasKey(false);
        setMaskedKey(null);
        setApiKey("");
        setSuccess("API key removed.");
      }
    } catch {
      setError("Failed to remove key.");
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    onClose();
  };

  const handleAddWorkflowKey = () => {
    if (!newLabel.trim() || !newKey.trim()) return;
    const added = addApiKey(newLabel.trim(), newProvider, newKey.trim());
    setWorkflowKeys((prev) => [...prev, added]);
    setNewLabel("");
    setNewKey("");
  };

  const handleDeleteWorkflowKey = (id: string) => {
    deleteApiKey(id);
    setWorkflowKeys((prev) => prev.filter((k) => k.id !== id));
  };

  const toggleVisibleKey = (id: string) => {
    setVisibleKeys((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const bg = isDarkMode
    ? "bg-zinc-900 border-zinc-700 text-white"
    : "bg-white border-slate-200 text-slate-900";
  const inputBg = isDarkMode
    ? "border-zinc-600 bg-zinc-800"
    : "border-slate-300 bg-white";

  const content = (
      <div
        className={`${bg} border rounded-xl p-6 w-full max-w-sm shadow-2xl`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Profile</h2>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-zinc-500/20"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 mb-3">
          <button
            onClick={() => setProfileTab("profile")}
            className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
              profileTab === "profile"
                ? isDarkMode ? "bg-zinc-700 text-zinc-200" : "bg-slate-200 text-slate-800"
                : isDarkMode ? "text-zinc-500 hover:text-zinc-300" : "text-slate-400 hover:text-slate-600"
            }`}
          >
            Profile
          </button>
          <button
            onClick={() => setProfileTab("apikeys")}
            className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
              profileTab === "apikeys"
                ? isDarkMode ? "bg-zinc-700 text-zinc-200" : "bg-slate-200 text-slate-800"
                : isDarkMode ? "text-zinc-500 hover:text-zinc-300" : "text-slate-400 hover:text-slate-600"
            }`}
          >
            API Keys
          </button>
        </div>

        {/* Profile tab */}
        {profileTab === "profile" && (
          <>
            {/* User info */}
            <div className="mb-4 pb-4 border-b border-zinc-700/30">
              <p className="text-sm font-medium">{user.email}</p>
              <p className="text-xs opacity-50 mt-0.5">
                {user.app_metadata?.provider === "google"
                  ? "Google account"
                  : "Email account"}
              </p>
            </div>

            {/* Gemini API Key */}
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <Key size={14} className="opacity-60" />
                <span className="text-sm font-medium">Gemini API Key</span>
              </div>

              {hasKey ? (
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-xs px-2 py-1.5 rounded bg-zinc-800/50 border border-zinc-700/50">
                    {maskedKey}
                  </code>
                  <button
                    onClick={handleDelete}
                    disabled={saving}
                    className="p-1.5 rounded hover:bg-red-500/20 text-red-400"
                    title="Remove key"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="relative">
                    <input
                      type={showKey ? "text" : "password"}
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSave()}
                      placeholder="AIza..."
                      className={`w-full px-3 py-2 pr-9 rounded-lg border ${inputBg} text-sm focus:outline-none focus:border-blue-500`}
                      disabled={saving}
                    />
                    <button
                      onClick={() => setShowKey(!showKey)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 opacity-50 hover:opacity-100"
                    >
                      {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                  <button
                    onClick={handleSave}
                    disabled={saving || !apiKey}
                    className="w-full px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors disabled:opacity-50"
                  >
                    {saving ? "Saving..." : "Save key"}
                  </button>
                </div>
              )}

              <p className="text-xs opacity-40 mt-2">
                Get your key at{" "}
                <a
                  href="https://aistudio.google.com/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                >
                  aistudio.google.com/apikey
                </a>
              </p>
            </div>

            {error && <p className="text-red-400 text-xs mb-2">{error}</p>}
            {success && <p className="text-green-400 text-xs mb-2">{success}</p>}

            {/* Sign out */}
            <button
              onClick={handleSignOut}
              className="w-full mt-2 px-4 py-2 rounded-lg border border-zinc-600 text-sm hover:bg-zinc-500/10 transition-colors"
            >
              Sign out
            </button>
          </>
        )}

        {/* API Keys tab */}
        {profileTab === "apikeys" && (
          <>
            <div className="space-y-2 max-h-[40vh] overflow-y-auto">
              {workflowKeys.length === 0 && (
                <p className={`text-sm ${isDarkMode ? "text-zinc-500" : "text-slate-400"}`}>No API keys stored yet.</p>
              )}
              {workflowKeys.map((k) => (
                <div key={k.id} className={`flex items-center gap-2 p-2 rounded-lg ${isDarkMode ? "bg-zinc-800" : "bg-slate-50"}`}>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${isDarkMode ? "bg-zinc-700 text-zinc-400" : "bg-slate-200 text-slate-600"}`}>
                    {k.provider}
                  </span>
                  <span className={`text-sm flex-1 truncate ${isDarkMode ? "text-zinc-300" : "text-slate-700"}`}>{k.label}</span>
                  <span className={`text-xs font-mono ${isDarkMode ? "text-zinc-500" : "text-slate-400"}`}>
                    {visibleKeys.has(k.id) ? k.key : `${k.key.slice(0, 8)}...`}
                  </span>
                  <button onClick={() => toggleVisibleKey(k.id)} className={`p-1 rounded ${isDarkMode ? "text-zinc-500 hover:text-zinc-300" : "text-slate-400 hover:text-slate-600"}`}>
                    {visibleKeys.has(k.id) ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                  <button onClick={() => handleDeleteWorkflowKey(k.id)} className="p-1 rounded text-red-500 hover:text-red-400">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>

            <div className={`mt-3 pt-3 border-t space-y-2 ${isDarkMode ? "border-zinc-700" : "border-slate-200"}`}>
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
                  onClick={handleAddWorkflowKey}
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
          </>
        )}
      </div>
  );

  if (inline) return content;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      {content}
    </div>
  );
}
