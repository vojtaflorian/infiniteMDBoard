"use client";

import { Trash2, Copy, Edit3 } from "lucide-react";
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
  const [isRenaming, setIsRenaming] = useState(false);
  const [name, setName] = useState(project.name);

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
          onClick={() => onDelete(project.id)}
          className={`p-1.5 rounded-lg hover:text-red-500 ${isDarkMode ? "hover:bg-zinc-800" : "hover:bg-slate-100"}`}
          title="Delete"
        >
          <Trash2 size={14} />
        </button>
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
