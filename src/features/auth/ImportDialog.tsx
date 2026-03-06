"use client";

import { useState } from "react";
import { useProjectStore } from "@/stores/projectStore";
import { useAuthStore } from "@/stores/authStore";
import { upsertProject } from "@/lib/supabase/projects";
import { useUIStore } from "@/stores/uiStore";
import { Upload, X } from "lucide-react";

interface ImportDialogProps {
  open: boolean;
  onClose: () => void;
}

export function ImportDialog({ open, onClose }: ImportDialogProps) {
  const projects = useProjectStore((s) => s.projects);
  const user = useAuthStore((s) => s.user);
  const isDarkMode = useUIStore((s) => s.isDarkMode);
  const [importing, setImporting] = useState(false);
  const [done, setDone] = useState(false);
  const [importedCount, setImportedCount] = useState(0);

  if (!open || !user) return null;

  const localProjectCount = projects.length;

  const handleImport = async () => {
    setImporting(true);
    let count = 0;
    for (const project of projects) {
      const success = await upsertProject(project.id, project.name, {
        blocks: project.blocks,
        connections: project.connections,
        camera: project.camera,
      });
      if (success) count++;
    }
    setImportedCount(count);
    setImporting(false);
    setDone(true);
  };

  const bg = isDarkMode
    ? "bg-zinc-900 border-zinc-700 text-white"
    : "bg-white border-slate-200 text-slate-900";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className={`${bg} border rounded-xl p-6 w-full max-w-sm shadow-2xl`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Import Local Projects</h2>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-zinc-500/20"
          >
            <X size={18} />
          </button>
        </div>

        {done ? (
          <div className="text-center py-4">
            <p className="font-medium">Import complete!</p>
            <p className="text-sm opacity-70 mt-1">
              {importedCount} project{importedCount !== 1 ? "s" : ""} synced to
              the cloud.
            </p>
            <button
              onClick={onClose}
              className="mt-4 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm"
            >
              Done
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 mb-4">
              <Upload size={24} className="opacity-60 shrink-0" />
              <p className="text-sm">
                You have <strong>{localProjectCount}</strong> local project
                {localProjectCount !== 1 ? "s" : ""}. Import them to your cloud
                account?
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={onClose}
                className={`flex-1 px-4 py-2 rounded-lg border text-sm hover:bg-zinc-500/10 ${isDarkMode ? "border-zinc-600" : "border-slate-300"}`}
              >
                Skip
              </button>
              <button
                onClick={handleImport}
                disabled={importing}
                className="flex-1 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium disabled:opacity-50"
              >
                {importing ? "Importing..." : "Import all"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
