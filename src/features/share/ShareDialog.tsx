"use client";

import { useState, useEffect } from "react";
import { useUIStore } from "@/stores/uiStore";
import { setShareToken } from "@/lib/supabase/projects";
import { createClient } from "@/lib/supabase/client";
import { APP_ID } from "@/lib/config";
import { nanoid } from "nanoid";
import { X, Copy, Check, Link2, Unlink } from "lucide-react";

interface ShareDialogProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
  inline?: boolean;
}

export function ShareDialog({ open, onClose, projectId, inline }: ShareDialogProps) {
  const isDarkMode = useUIStore((s) => s.isDarkMode);
  const [shareToken, setShareTokenState] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) return;
    const supabase = createClient();
    supabase
      .from("projects")
      .select("share_token")
      .eq("id", projectId)
      .eq("app_id", APP_ID)
      .single()
      .then(({ data }) => {
        setShareTokenState(data?.share_token ?? null);
      });
  }, [open, projectId]);

  if (!open) return null;

  const shareUrl = shareToken
    ? `${window.location.origin}/share/${shareToken}`
    : null;

  const handleGenerate = async () => {
    setLoading(true);
    const token = nanoid(21);
    const success = await setShareToken(projectId, token);
    if (success) setShareTokenState(token);
    setLoading(false);
  };

  const handleRevoke = async () => {
    setLoading(true);
    const success = await setShareToken(projectId, null);
    if (success) setShareTokenState(null);
    setLoading(false);
  };

  const handleCopy = async () => {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const bg = isDarkMode
    ? "bg-zinc-900 border-zinc-700 text-white"
    : "bg-white border-slate-200 text-slate-900";
  const inputBg = isDarkMode
    ? "bg-zinc-800 border-zinc-600"
    : "bg-slate-100 border-slate-300";

  const content = (
    <div
      className={`${bg} border rounded-xl p-6 w-full max-w-sm shadow-2xl`}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Share Project</h2>
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-zinc-500/20"
        >
          <X size={18} />
        </button>
      </div>

      {shareToken ? (
        <div className="space-y-3">
          <p className="text-sm opacity-70">
            Anyone with the link can view and save a copy.
          </p>
          <div className="flex gap-2">
            <input
              readOnly
              value={shareUrl ?? ""}
              className={`flex-1 px-3 py-2 rounded-lg border text-xs ${inputBg}`}
            />
            <button
              onClick={handleCopy}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                copied
                  ? "bg-green-600 text-white"
                  : "bg-blue-600 hover:bg-blue-700 text-white"
              }`}
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
          <button
            onClick={handleRevoke}
            disabled={loading}
            className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 disabled:opacity-50"
          >
            <Unlink size={12} /> Revoke link
          </button>
        </div>
      ) : (
        <div className="text-center py-2">
          <p className="text-sm opacity-70 mb-3">
            Generate a share link. Recipients get their own copy.
          </p>
          <button
            onClick={handleGenerate}
            disabled={loading}
            className="flex items-center gap-2 mx-auto px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            <Link2 size={16} />
            {loading ? "Generating..." : "Generate link"}
          </button>
        </div>
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
