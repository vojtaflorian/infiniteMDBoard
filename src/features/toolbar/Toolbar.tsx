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
  Upload,
  FileImage,
  FileText,
  Share2,
  User,
  LogIn,
  Bot,
  FileInput,
  Eye,
  Key,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useCanvasStore } from "@/stores/canvasStore";
import { useUIStore } from "@/stores/uiStore";
import { useProjectStore } from "@/stores/projectStore";
import { useAuthStore } from "@/stores/authStore";
import { useRouter } from "next/navigation";
import { createLogger } from "@/lib/logger";
import { AuthModal } from "@/features/auth/AuthModal";
import { ProfileModal } from "@/features/auth/ProfileModal";
import { ShareDialog } from "@/features/share/ShareDialog";
import { ApiKeySettings } from "@/features/settings/ApiKeySettings";
import {
  downloadJson,
  exportCanvasAsPng,
  exportCanvasAsPdf,
  getBlocksBoundingBox,
  importProjectFromJson,
} from "@/lib/storage";
import type { BlockType, Tool } from "@/types";

const log = createLogger("Toolbar");

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
  const user = useAuthStore((s) => s.user);
  const [isEditingName, setIsEditingName] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [apiKeySettingsOpen, setApiKeySettingsOpen] = useState(false);

  // Close export dropdown on outside click
  useEffect(() => {
    if (!exportOpen) return;
    const close = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-export-dropdown]")) {
        setExportOpen(false);
      }
    };
    setTimeout(() => document.addEventListener("click", close), 0);
    return () => document.removeEventListener("click", close);
  }, [exportOpen]);

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

  const handleExportJson = () => {
    setExportOpen(false);
    if (!activeProjectId) return;
    saveActiveProject(toProjectData());
    const project = getProject(activeProjectId);
    if (!project) return;
    downloadJson(JSON.stringify(project, null, 2), `${project.name}.json`);
  };

  const handleExportPng = async () => {
    setExportOpen(false);
    const canvasEl = document.querySelector("[data-canvas]") as HTMLElement;
    if (!canvasEl) return;
    const { blocks, camera } = useCanvasStore.getState();
    const bbox = getBlocksBoundingBox(blocks);
    const name = projectName || "board";
    try {
      await exportCanvasAsPng(canvasEl, `${name}.png`, useCanvasStore.getState().setCamera, camera, bbox);
    } catch (err) {
      log.error("PNG export failed", err);
    }
  };

  const handleExportPdf = async () => {
    setExportOpen(false);
    const canvasEl = document.querySelector("[data-canvas]") as HTMLElement;
    if (!canvasEl) return;
    const { blocks, camera } = useCanvasStore.getState();
    const bbox = getBlocksBoundingBox(blocks);
    const name = projectName || "board";
    try {
      await exportCanvasAsPdf(canvasEl, `${name}.pdf`, useCanvasStore.getState().setCamera, camera, bbox);
    } catch (err) {
      log.error("PDF export failed", err);
    }
  };

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    setExportOpen(false);
    const file = e.target.files?.[0];
    if (!file) return;
    file.text().then((text) => {
      const project = importProjectFromJson(text);
      if (project) {
        useCanvasStore.getState().loadProject(project);
      }
    });
    e.target.value = "";
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
      onClick={() => setTool(activeTool === tool ? "select" : tool)}
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
    <>
    {/* Project name floating below toolbar */}
    {activeProjectId && (
      <div className="absolute top-[72px] left-1/2 -translate-x-1/2 z-40">
        {isEditingName ? (
          <input
            autoFocus
            className={`text-sm font-semibold bg-transparent outline-none border-b px-3 py-1 text-center ${
              isDarkMode
                ? "text-zinc-200 border-zinc-500 focus:border-zinc-300"
                : "text-slate-700 border-slate-400 focus:border-slate-600"
            }`}
            style={{ minWidth: "120px", width: `${Math.max(projectName.length, 8)}ch` }}
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
            className={`text-sm font-semibold px-3 py-1 rounded-lg transition-colors ${
              isDarkMode
                ? "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60"
                : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/60"
            }`}
            title="Click to rename project"
          >
            {projectName}
          </button>
        )}
      </div>
    )}

    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 flex gap-2 p-2 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 shadow-2xl">
      <button
        onClick={handleBack}
        className="p-3 rounded-xl hover:bg-white/10 transition-all"
        title="Back to projects"
      >
        <ArrowLeft size={20} />
      </button>
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
      <div className="w-px h-8 bg-white/10 mx-1 self-center" />
      <button
        onClick={() => handleAddBlock("ai-agent")}
        className="p-3 rounded-xl hover:bg-white/10 transition-all text-blue-400"
        title="Add AI Agent block"
      >
        <Bot size={20} />
      </button>
      <button
        onClick={() => handleAddBlock("ai-input")}
        className="p-3 rounded-xl hover:bg-white/10 transition-all text-green-400"
        title="Add Input block"
      >
        <FileInput size={20} />
      </button>
      <button
        onClick={() => handleAddBlock("ai-viewer")}
        className="p-3 rounded-xl hover:bg-white/10 transition-all text-purple-400"
        title="Add Viewer block"
      >
        <Eye size={20} />
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

      <div className="relative" data-export-dropdown onClick={(e) => e.stopPropagation()}>
        <button
          onClick={() => setExportOpen(!exportOpen)}
          className="p-3 rounded-xl hover:bg-white/10 transition-all"
          title="Export / Import"
        >
          <Download size={20} />
        </button>
        {exportOpen && (
          <div className={`absolute top-full right-0 mt-2 w-48 rounded-xl border shadow-xl backdrop-blur-md ${
            isDarkMode ? "bg-zinc-900/95 border-zinc-700" : "bg-white/95 border-slate-200"
          }`}>
            <button onClick={handleExportJson} className={`w-full px-4 py-2 text-left text-sm flex items-center gap-2 rounded-t-xl ${isDarkMode ? "hover:bg-zinc-800" : "hover:bg-slate-100"}`}>
              <Download size={14} /> Export JSON
            </button>
            <button onClick={handleExportPng} className={`w-full px-4 py-2 text-left text-sm flex items-center gap-2 ${isDarkMode ? "hover:bg-zinc-800" : "hover:bg-slate-100"}`}>
              <FileImage size={14} /> Export PNG
            </button>
            <button onClick={handleExportPdf} className={`w-full px-4 py-2 text-left text-sm flex items-center gap-2 ${isDarkMode ? "hover:bg-zinc-800" : "hover:bg-slate-100"}`}>
              <FileText size={14} /> Export PDF
            </button>
            <div className={`border-t ${isDarkMode ? "border-zinc-700" : "border-slate-200"}`} />
            <label className={`w-full px-4 py-2 text-left text-sm flex items-center gap-2 cursor-pointer rounded-b-xl ${isDarkMode ? "hover:bg-zinc-800" : "hover:bg-slate-100"}`}>
              <Upload size={14} /> Import JSON
              <input type="file" accept=".json" className="hidden" onChange={handleImportJson} />
            </label>
          </div>
        )}
      </div>
      <button
        onClick={() => setApiKeySettingsOpen(true)}
        className="p-3 rounded-xl hover:bg-white/10 transition-all"
        title="API Keys"
      >
        <Key size={20} />
      </button>
      <button
        onClick={toggleTheme}
        className="p-3 rounded-xl hover:bg-white/10 transition-all"
        title="Toggle theme"
      >
        {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
      </button>
      <div className="w-px h-8 bg-white/10 mx-1 self-center" />

      {user && (
        <button
          onClick={() => setShareOpen(true)}
          className="p-3 rounded-xl hover:bg-white/10 transition-all"
          title="Share project"
        >
          <Share2 size={20} />
        </button>
      )}

      {user ? (
        <button
          onClick={() => setProfileOpen(true)}
          className="p-3 rounded-xl hover:bg-white/10 transition-all"
          title={user.email ?? "Profile"}
        >
          {user.user_metadata?.avatar_url ? (
            <img
              src={user.user_metadata.avatar_url}
              alt=""
              className="w-5 h-5 rounded-full"
              referrerPolicy="no-referrer"
            />
          ) : (
            <User size={20} />
          )}
        </button>
      ) : (
        <button
          onClick={() => setAuthModalOpen(true)}
          className="p-3 rounded-xl hover:bg-white/10 transition-all text-blue-400"
          title="Sign in"
        >
          <LogIn size={20} />
        </button>
      )}

      <AuthModal open={authModalOpen} onClose={() => setAuthModalOpen(false)} />
      {apiKeySettingsOpen && <ApiKeySettings open={apiKeySettingsOpen} onClose={() => setApiKeySettingsOpen(false)} />}
    </div>

    {/* Profile dropdown — below toolbar, right-aligned */}
    {profileOpen && (
      <div className="fixed inset-0 z-[60]" onClick={() => setProfileOpen(false)}>
        <div
          className="absolute top-[72px] right-4"
          onClick={(e) => e.stopPropagation()}
        >
          <ProfileModal open={profileOpen} onClose={() => setProfileOpen(false)} inline />
        </div>
      </div>
    )}

    {/* Share dropdown — below toolbar, right-aligned */}
    {shareOpen && activeProjectId && (
      <div className="fixed inset-0 z-[60]" onClick={() => setShareOpen(false)}>
        <div
          className="absolute top-[72px] right-4"
          onClick={(e) => e.stopPropagation()}
        >
          <ShareDialog open={shareOpen} onClose={() => setShareOpen(false)} projectId={activeProjectId} inline />
        </div>
      </div>
    )}
    </>
  );
}
