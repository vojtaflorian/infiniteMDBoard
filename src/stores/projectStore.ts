import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Project } from "@/types";
import { generateId } from "@/lib/id";
import { createLogger } from "@/lib/logger";

const log = createLogger("projectStore");

interface ProjectState {
  projects: Project[];
  activeProjectId: string | null;

  createProject: (name: string) => string;
  deleteProject: (id: string) => void;
  renameProject: (id: string, name: string) => void;
  duplicateProject: (id: string) => string | null;
  saveActiveProject: (
    data: Pick<Project, "blocks" | "connections" | "camera">,
  ) => void;
  getProject: (id: string) => Project | undefined;
  setActiveProject: (id: string | null) => void;
  importProject: (project: Project) => string;
}

function createEmptyProject(name: string): Project {
  const now = new Date().toISOString();
  return {
    id: generateId(),
    name,
    createdAt: now,
    updatedAt: now,
    blocks: [],
    connections: [],
    camera: { x: 0, y: 0, zoom: 1 },
  };
}

export const useProjectStore = create<ProjectState>()(
  persist(
    (set, get) => ({
      projects: [],
      activeProjectId: null,

      createProject: (name) => {
        const project = createEmptyProject(name);
        log.info("Created project", project.id, name);
        set((s) => ({ projects: [...s.projects, project] }));
        return project.id;
      },

      deleteProject: (id) => {
        log.info("Deleted project", id);
        set((s) => ({
          projects: s.projects.filter((p) => p.id !== id),
          activeProjectId:
            s.activeProjectId === id ? null : s.activeProjectId,
        }));
      },

      renameProject: (id, name) => {
        set((s) => ({
          projects: s.projects.map((p) =>
            p.id === id
              ? { ...p, name, updatedAt: new Date().toISOString() }
              : p,
          ),
        }));
      },

      duplicateProject: (id) => {
        const source = get().projects.find((p) => p.id === id);
        if (!source) return null;
        const newProject: Project = {
          ...source,
          id: generateId(),
          name: `${source.name} (copy)`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        log.info("Duplicated project", id, "->", newProject.id);
        set((s) => ({ projects: [...s.projects, newProject] }));
        return newProject.id;
      },

      saveActiveProject: (data) => {
        const { activeProjectId } = get();
        if (!activeProjectId) return;
        set((s) => ({
          projects: s.projects.map((p) =>
            p.id === activeProjectId
              ? { ...p, ...data, updatedAt: new Date().toISOString() }
              : p,
          ),
        }));
      },

      getProject: (id) => get().projects.find((p) => p.id === id),
      setActiveProject: (id) => set({ activeProjectId: id }),

      importProject: (project) => {
        const newProject: Project = {
          ...project,
          id: generateId(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        log.info("Imported project", newProject.id, newProject.name);
        set((s) => ({ projects: [...s.projects, newProject] }));
        return newProject.id;
      },
    }),
    { name: "infiniteMDBoard_projects" },
  ),
);
