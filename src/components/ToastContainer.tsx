"use client";

import { CheckCircle2, XCircle, Info, X } from "lucide-react";
import { useUIStore } from "@/stores/uiStore";

const iconMap = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
};

const colorMap = {
  success: "bg-green-600",
  error: "bg-red-600",
  info: "bg-blue-600",
};

export function ToastContainer() {
  const toasts = useUIStore((s) => s.toasts);
  const removeToast = useUIStore((s) => s.removeToast);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => {
        const Icon = iconMap[toast.type];
        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-medium shadow-lg animate-in fade-in slide-in-from-bottom-2 duration-200 ${colorMap[toast.type]}`}
          >
            <Icon size={16} className="shrink-0" />
            <span>{toast.message}</span>
            <button
              onClick={() => removeToast(toast.id)}
              className="ml-2 p-0.5 rounded hover:bg-white/20 transition-colors shrink-0"
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
