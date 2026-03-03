"use client";

import {
  MousePointer2,
  Type,
  Image as ImageIcon,
  Link,
  StickyNote,
  Frame,
  Search,
  ArrowRight,
  Sun,
  Moon,
  Undo2,
  Redo2,
  Download,
  ArrowLeft,
} from "lucide-react";
import { useState } from "react";
import { useCanvasStore } from "@/stores/canvasStore";
import { useUIStore } from "@/stores/uiStore";
import { useProjectStore } from "@/stores/projectStore";
import { useRouter } from "next/navigation";
import { downloadJson } from "@/lib/storage";
import type { BlockType, Tool } from "@/types";

export function Toolbar() {
  const router = useRouter();
  const activeTool = useCanvasStore((s) => s.activeTool);
  const setTool = useCanvasStore((s) => s.setTool);
  const addBlock = useCanvasStore((s) => s.addBlock);
  const toProjectData = useCanvasStore((s) => s.toProjectData);
  const { isDarkMode, toggleTheme, setSearchOpen } = useUIStore();
  const saveActiveProject = useProjectStore((s) => s.saveActiveProject);
  const activeProjectId = useProjectStore((s) => s.activeProjectId);
  const getProject = useProjectStore((s) => s.getProject);
  const renameProject = useProjectStore((s) => s.renameProject);
  const projectName = activeProjectId ? getProject(activeProjectId)?.name ?? "" : "";
  const [isEditingName, setIsEditingName] = useState(false);

  const handleAddBlock = (type: BlockType) => {
    const cam = useCanvasStore.getState().camera;
    const position = {
      x: -cam.x + window.innerWidth / 2 / cam.zoom,
      y: -cam.y + window.innerHeight / 2 / cam.zoom,
    };
    addBlock(type, position);
  };

  const handleUndo = () => {
    useCanvasStore.temporal.getState().undo();
  };

  const handleRedo = () => {
    useCanvasStore.temporal.getState().redo();
  };

  const handleExport = () => {
    if (!activeProjectId) return;
    saveActiveProject(toProjectData());
    const project = getProject(activeProjectId);
    if (!project) return;
    downloadJson(JSON.stringify(project, null, 2), `${project.name}.json`);
  };

  const handleBack = () => {
    saveActiveProject(toProjectData());
    router.push("/");
  };

  const toolButton = (
    tool: Tool,
    icon: React.ReactNode,
    title: string,
    activeColor = "bg-blue-600",
  ) => (
    <button
      key={tool}
      onClick={() => setTool(tool)}
      className={`p-3 rounded-xl transition-all ${
        activeTool === tool
          ? `${activeColor} text-white`
          : "hover:bg-white/10"
      }`}
      title={title}
    >
      {icon}
    </button>
  );

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 flex gap-2 p-2 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 shadow-2xl">
      <button
        onClick={handleBack}
        className="p-3 rounded-xl hover:bg-white/10 transition-all"
        title="Back to projects"
      >
        <ArrowLeft size={20} />
      </button>
      {activeProjectId && (
        isEditingName ? (
          <input
            autoFocus
            className={`text-sm font-semibold bg-transparent outline-none border-b px-2 py-0.5 self-center ${
              isDarkMode
                ? "text-zinc-300 border-zinc-600 focus:border-zinc-400"
                : "text-slate-600 border-slate-300 focus:border-slate-500"
            }`}
            style={{ minWidth: "80px", width: `${Math.max(projectName.length, 6)}ch` }}
            value={projectName}
            onChange={(e) => renameProject(activeProjectId, e.target.value)}
            onMouseDown={(e) => e.stopPropagation()}
            onBlur={() => setIsEditingName(false)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === "Escape") setIsEditingName(false);
            }}
          />
        ) : (
          <button
            onClick={() => setIsEditingName(true)}
            className={`text-sm font-semibold px-2 py-0.5 rounded transition-colors max-w-[120px] truncate ${
              isDarkMode
                ? "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60"
                : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/60"
            }`}
            title="Click to rename project"
          >
            {projectName}
          </button>
        )
      )}
      <div className="w-px h-8 bg-white/10 mx-1 self-center" />

      {toolButton("select", <MousePointer2 size={20} />, "Select tool")}
      <div className="w-px h-8 bg-white/10 mx-1 self-center" />

      <button
        onClick={() => handleAddBlock("text")}
        className="p-3 rounded-xl hover:bg-white/10 transition-all text-emerald-400"
        title="Add text block"
      >
        <Type size={20} />
      </button>
      <button
        onClick={() => handleAddBlock("image")}
        className="p-3 rounded-xl hover:bg-white/10 transition-all text-amber-400"
        title="Add image block"
      >
        <ImageIcon size={20} />
      </button>
      <button
        onClick={() => handleAddBlock("link")}
        className="p-3 rounded-xl hover:bg-white/10 transition-all text-sky-400"
        title="Add link block"
      >
        <Link size={20} />
      </button>
      <button
        onClick={() => handleAddBlock("sticky")}
        className="p-3 rounded-xl hover:bg-white/10 transition-all text-yellow-400"
        title="Add sticky note"
      >
        <StickyNote size={20} />
      </button>
      <button
        onClick={() => handleAddBlock("frame")}
        className="p-3 rounded-xl hover:bg-white/10 transition-all text-slate-400"
        title="Add frame"
      >
        <Frame size={20} />
      </button>
      {toolButton(
        "connect",
        <ArrowRight size={20} />,
        "Connect blocks",
        "bg-purple-600",
      )}
      <div className="w-px h-8 bg-white/10 mx-1 self-center" />

      <button
        onClick={() => setSearchOpen(true)}
        className="p-3 rounded-xl hover:bg-white/10 transition-all"
        title="Search blocks (Cmd+F)"
      >
        <Search size={20} />
      </button>
      <div className="w-px h-8 bg-white/10 mx-1 self-center" />

      <button
        onClick={handleUndo}
        className="p-3 rounded-xl hover:bg-white/10 transition-all"
        title="Undo (Ctrl+Z)"
      >
        <Undo2 size={20} />
      </button>
      <button
        onClick={handleRedo}
        className="p-3 rounded-xl hover:bg-white/10 transition-all"
        title="Redo (Ctrl+Shift+Z)"
      >
        <Redo2 size={20} />
      </button>
      <div className="w-px h-8 bg-white/10 mx-1 self-center" />

      <button
        onClick={handleExport}
        className="p-3 rounded-xl hover:bg-white/10 transition-all"
        title="Export project"
      >
        <Download size={20} />
      </button>
      <button
        onClick={toggleTheme}
        className="p-3 rounded-xl hover:bg-white/10 transition-all"
        title="Toggle theme"
      >
        {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
      </button>
    </div>
  );
}
