"use client";

import { Trash2, Copy, Edit3, Check, X } from "lucide-react";
import { useUIStore } from "@/stores/uiStore";
import type { Project } from "@/types";
import { useState } from "react";
import Link from "next/link";

interface ProjectCardProps {
  project: Project;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  onRename: (id: string, name: string) => void;
}

export function ProjectCard({
  project,
  onDelete,
  onDuplicate,
  onRename,
}: ProjectCardProps) {
  const isDarkMode = useUIStore((s) => s.isDarkMode);
  const addToast = useUIStore((s) => s.addToast);
  const [isRenaming, setIsRenaming] = useState(false);
  const [name, setName] = useState(project.name);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleRename = () => {
    if (name.trim()) onRename(project.id, name.trim());
    setIsRenaming(false);
  };

  return (
    <div
      className={`group relative rounded-xl border-2 p-5 transition-all hover:shadow-lg ${
        isDarkMode
          ? "bg-zinc-900 border-zinc-800 hover:border-zinc-700"
          : "bg-white border-slate-200 hover:border-slate-300 shadow-sm"
      }`}
    >
      <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {confirmDelete ? (
          <div className="flex items-center gap-1">
            <span className="text-xs text-red-500 mr-1">Delete?</span>
            <button
              onClick={() => {
                onDelete(project.id);
                addToast("Project deleted", "success");
                setConfirmDelete(false);
              }}
              className="p-1.5 rounded-lg text-red-500 hover:bg-red-500/10"
              title="Confirm delete"
            >
              <Check size={14} />
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              className={`p-1.5 rounded-lg ${isDarkMode ? "hover:bg-zinc-800" : "hover:bg-slate-100"}`}
              title="Cancel"
            >
              <X size={14} />
            </button>
          </div>
        ) : (
          <>
            <button
              onClick={() => setIsRenaming(true)}
              className={`p-1.5 rounded-lg ${isDarkMode ? "hover:bg-zinc-800" : "hover:bg-slate-100"}`}
              title="Rename"
            >
              <Edit3 size={14} />
            </button>
            <button
              onClick={() => onDuplicate(project.id)}
              className={`p-1.5 rounded-lg ${isDarkMode ? "hover:bg-zinc-800" : "hover:bg-slate-100"}`}
              title="Duplicate"
            >
              <Copy size={14} />
            </button>
            <button
              onClick={() => setConfirmDelete(true)}
              className={`p-1.5 rounded-lg hover:text-red-500 ${isDarkMode ? "hover:bg-zinc-800" : "hover:bg-slate-100"}`}
              title="Delete"
            >
              <Trash2 size={14} />
            </button>
          </>
        )}
      </div>

      <Link href={`/canvas/${project.id}`} className="block">
        {isRenaming ? (
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={handleRename}
            onKeyDown={(e) => e.key === "Enter" && handleRename()}
            className={`text-lg font-bold bg-transparent outline-none border-b-2 w-full ${
              isDarkMode ? "border-zinc-600" : "border-slate-400"
            }`}
            onClick={(e) => e.preventDefault()}
          />
        ) : (
          <h3 className="text-lg font-bold mb-2">{project.name}</h3>
        )}
        {project.blocks.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {project.blocks.slice(0, 3).map((block) => (
              <span
                key={block.id}
                className={`text-[10px] px-1.5 py-0.5 rounded ${
                  isDarkMode ? "bg-zinc-800 text-zinc-400" : "bg-slate-100 text-slate-500"
                }`}
              >
                {block.title || block.type}
              </span>
            ))}
            {project.blocks.length > 3 && (
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded ${
                  isDarkMode ? "bg-zinc-800 text-zinc-500" : "bg-slate-100 text-slate-400"
                }`}
              >
                +{project.blocks.length - 3}
              </span>
            )}
          </div>
        )}
        <p className="text-sm opacity-60">
          {project.blocks.length} blocks &middot;{" "}
          {project.connections.length} connections
        </p>
        <p className="text-xs opacity-40 mt-2">
          Updated {new Date(project.updatedAt).toLocaleDateString()}
        </p>
      </Link>
    </div>
  );
}
