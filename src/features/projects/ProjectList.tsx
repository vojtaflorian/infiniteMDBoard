"use client";

import { Plus, Upload, Download } from "lucide-react";
import { useProjectStore } from "@/stores/projectStore";
import { useUIStore } from "@/stores/uiStore";
import { ProjectCard } from "./ProjectCard";
import { useRouter } from "next/navigation";
import { useRef } from "react";
import { importProjectFromJson, importAllFromJson, downloadJson } from "@/lib/storage";
import { createLogger } from "@/lib/logger";
import { APP_VERSION, APP_NAME } from "@/lib/config";

const log = createLogger("ProjectList");

export function ProjectList() {
  const router = useRouter();
  const {
    projects,
    createProject,
    deleteProject,
    duplicateProject,
    renameProject,
    importProject,
  } = useProjectStore();
  const isDarkMode = useUIStore((s) => s.isDarkMode);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleNewProject = () => {
    const name = window.prompt("Project name:", "Untitled Project");
    if (!name) return;
    const id = createProject(name.trim());
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
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">infiniteMDBoard</h1>
          <div className="flex gap-2">
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
          </div>
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

        <footer className="mt-16 text-center text-xs opacity-30">
          {APP_NAME} v{APP_VERSION}
        </footer>
      </div>
    </div>
  );
}
