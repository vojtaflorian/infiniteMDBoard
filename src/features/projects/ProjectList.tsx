"use client";

import { Plus, Upload, Download, LogIn, User, Cloud, Workflow } from "lucide-react";
import { useProjectStore } from "@/stores/projectStore";
import { useUIStore } from "@/stores/uiStore";
import { useAuthStore } from "@/stores/authStore";
import { ProjectCard } from "./ProjectCard";
import { useRouter } from "next/navigation";
import { useRef, useState, useEffect } from "react";
import { importProjectFromJson, importAllFromJson, downloadJson } from "@/lib/storage";
import { fetchProjects, type CloudProject } from "@/lib/supabase/projects";
import { createLogger } from "@/lib/logger";
import { APP_VERSION, APP_NAME, APP_TAGLINE, APP_FEATURES } from "@/lib/config";
import { AuthModal } from "@/features/auth/AuthModal";
import { ProfileModal } from "@/features/auth/ProfileModal";
import { ImportDialog } from "@/features/auth/ImportDialog";
import { TemplatePicker } from "./TemplatePicker";
import type { WorkflowTemplate } from "@/lib/execution/templates";

const log = createLogger("ProjectList");

export function ProjectList() {
  const router = useRouter();
  const {
    projects,
    createProject,
    createProjectWithData,
    deleteProject,
    duplicateProject,
    renameProject,
    importProject,
    mergeCloudProjects,
  } = useProjectStore();
  const isDarkMode = useUIStore((s) => s.isDarkMode);
  const user = useAuthStore((s) => s.user);
  const initialized = useAuthStore((s) => s.initialized);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [cloudSynced, setCloudSynced] = useState(false);
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false);

  // Load cloud projects on login
  useEffect(() => {
    if (!user || !initialized || cloudSynced) return;
    let cancelled = false;
    (async () => {
      const cloudProjects = await fetchProjects();
      if (cancelled) return;

      const { hasLocalOnly } = mergeCloudProjects(cloudProjects);
      if (hasLocalOnly) {
        setImportDialogOpen(true);
      }

      setCloudSynced(true);
    })();
    return () => { cancelled = true; };
  }, [user, initialized, cloudSynced, mergeCloudProjects]);

  const handleNewProject = () => {
    const name = window.prompt("Project name:", "Untitled Project");
    if (!name) return;
    const id = createProject(name.trim());
    router.push(`/canvas/${id}`);
  };

  const handleTemplateSelect = (template: WorkflowTemplate) => {
    const { blocks, connections } = template.create();
    const id = createProjectWithData(template.name, { blocks, connections });
    setTemplatePickerOpen(false);
    router.push(`/canvas/${id}`);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const json = event.target?.result as string;
      // Try "export all" bundle first ({ version: 1, projects: [...] })
      const allProjects = importAllFromJson(json);
      if (allProjects) {
        for (const p of allProjects) {
          importProject(p);
        }
        log.info("Imported all projects", allProjects.length);
        return;
      }
      // Fall back to single project import
      const project = importProjectFromJson(json);
      if (project) {
        importProject(project);
        log.info("Imported project", project.name);
      } else {
        log.error("Failed to import — invalid JSON format");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleExportAll = () => {
    const data = JSON.stringify({ version: 1, projects }, null, 2);
    downloadJson(data, "infiniteMDBoard-all-projects.json");
  };

  return (
    <div
      className={`min-h-screen p-8 ${
        isDarkMode ? "bg-zinc-950 text-white" : "bg-slate-50 text-slate-900"
      }`}
    >
      <div className="max-w-5xl mx-auto">
        <div className="mb-10">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-3xl font-bold">infiniteMDBoard</h1>
            <div className="flex gap-2 items-center">
            {user && (
              <span className="flex items-center gap-1 text-xs opacity-40 mr-2">
                <Cloud size={12} /> Cloud
              </span>
            )}
            <button
              onClick={handleExportAll}
              className={`p-2 rounded-lg transition-all ${
                isDarkMode ? "hover:bg-zinc-800" : "hover:bg-slate-200"
              }`}
              title="Export all"
              disabled={projects.length === 0}
            >
              <Download size={20} />
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className={`p-2 rounded-lg transition-all ${
                isDarkMode ? "hover:bg-zinc-800" : "hover:bg-slate-200"
              }`}
              title="Import project"
            >
              <Upload size={20} />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleImport}
              className="hidden"
            />
            {user ? (
              <button
                onClick={() => setProfileOpen(true)}
                className={`p-2 rounded-lg transition-all ${
                  isDarkMode ? "hover:bg-zinc-800" : "hover:bg-slate-200"
                }`}
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
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all text-blue-400 border ${
                  isDarkMode
                    ? "border-blue-500/30 hover:bg-blue-500/10"
                    : "border-blue-400/40 hover:bg-blue-50"
                }`}
              >
                <LogIn size={14} />
                Sign in
              </button>
            )}
          </div>
          </div>
          <p className={`text-sm ${isDarkMode ? "text-zinc-400" : "text-slate-500"}`}>
            {APP_TAGLINE}
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <button
            onClick={handleNewProject}
            className={`rounded-xl border-2 border-dashed p-8 flex flex-col items-center justify-center gap-2 transition-all ${
              isDarkMode
                ? "border-zinc-800 hover:border-zinc-600 hover:bg-zinc-900/50"
                : "border-slate-300 hover:border-slate-400 hover:bg-slate-100"
            }`}
          >
            <Plus size={32} className="opacity-50" />
            <span className="text-sm opacity-60">New Project</span>
          </button>
          <button
            onClick={() => setTemplatePickerOpen(true)}
            className={`rounded-xl border-2 border-dashed p-8 flex flex-col items-center justify-center gap-2 transition-all ${
              isDarkMode
                ? "border-purple-900/50 hover:border-purple-700 hover:bg-purple-950/30"
                : "border-purple-200 hover:border-purple-400 hover:bg-purple-50"
            }`}
          >
            <Workflow size={32} className="opacity-50" />
            <span className="text-sm opacity-60">New AI Workflow</span>
          </button>
          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onDelete={deleteProject}
              onDuplicate={duplicateProject}
              onRename={renameProject}
            />
          ))}
        </div>
        {projects.length === 0 && (
          <p className="text-center opacity-40 mt-12">
            No projects yet. Click &quot;New Project&quot; to get started.
          </p>
        )}

        <div className={`mt-16 grid grid-cols-2 gap-x-8 gap-y-1 text-xs ${isDarkMode ? "text-zinc-600" : "text-slate-400"}`}>
          {APP_FEATURES.map((f) => (
            <span key={f.short}>• {f.short}</span>
          ))}
        </div>

        <footer className="mt-6 text-center text-xs opacity-30">
          {APP_NAME} v{APP_VERSION}
        </footer>
      </div>

      <AuthModal open={authModalOpen} onClose={() => setAuthModalOpen(false)} />
      <ProfileModal open={profileOpen} onClose={() => setProfileOpen(false)} />
      <ImportDialog open={importDialogOpen} onClose={() => setImportDialogOpen(false)} />
      <TemplatePicker open={templatePickerOpen} onClose={() => setTemplatePickerOpen(false)} onSelect={handleTemplateSelect} />
    </div>
  );
}
