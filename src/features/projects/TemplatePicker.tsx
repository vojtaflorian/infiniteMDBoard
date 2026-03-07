"use client";

import { X } from "lucide-react";
import { useUIStore } from "@/stores/uiStore";
import { WORKFLOW_TEMPLATES, type WorkflowTemplate } from "@/lib/execution/templates";

interface TemplatePickerProps {
  open: boolean;
  onClose: () => void;
  onSelect?: (template: WorkflowTemplate) => void;
  onInsert?: (template: WorkflowTemplate) => void;
}

export function TemplatePicker({ open, onClose, onSelect, onInsert }: TemplatePickerProps) {
  const isDarkMode = useUIStore((s) => s.isDarkMode);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Modal */}
      <div
        className={`relative z-10 w-full max-w-lg rounded-xl p-6 shadow-2xl ${
          isDarkMode ? "bg-zinc-900 border border-zinc-800" : "bg-white border border-slate-200"
        }`}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className={`text-lg font-semibold ${isDarkMode ? "text-zinc-100" : "text-slate-900"}`}>
            New AI Workflow
          </h2>
          <button
            onClick={onClose}
            className={`p-1 rounded-lg transition-colors ${
              isDarkMode ? "hover:bg-zinc-800 text-zinc-400" : "hover:bg-slate-100 text-slate-500"
            }`}
          >
            <X size={18} />
          </button>
        </div>
        <p className={`text-sm mb-4 ${isDarkMode ? "text-zinc-400" : "text-slate-500"}`}>
          Pick a starter template. You can customize everything after creation.
        </p>
        <div className="grid grid-cols-2 gap-3">
          {WORKFLOW_TEMPLATES.map((t) => (
            <button
              key={t.name}
              onClick={() => {
                if (onInsert) {
                  onInsert(t);
                } else if (onSelect) {
                  onSelect(t);
                }
                onClose();
              }}
              className={`text-left rounded-lg p-4 border transition-all ${
                isDarkMode
                  ? "border-zinc-700 hover:border-zinc-500 hover:bg-zinc-800"
                  : "border-slate-200 hover:border-slate-400 hover:bg-slate-50"
              }`}
            >
              <div className="text-2xl mb-2">{t.icon}</div>
              <div className={`text-sm font-medium ${isDarkMode ? "text-zinc-200" : "text-slate-800"}`}>
                {t.name}
              </div>
              <div className={`text-xs mt-1 ${isDarkMode ? "text-zinc-500" : "text-slate-400"}`}>
                {t.description}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
