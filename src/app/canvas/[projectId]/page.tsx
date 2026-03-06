"use client";

import { useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { useCanvasStore } from "@/stores/canvasStore";
import { useProjectStore } from "@/stores/projectStore";
import { useUIStore } from "@/stores/uiStore";
import { Canvas } from "@/features/canvas/Canvas";
import { useCloudSync } from "@/hooks/useCloudSync";
import { createLogger } from "@/lib/logger";

const log = createLogger("CanvasPage");
const AUTO_SAVE_INTERVAL = 1000;

export default function CanvasPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = use(params);
  const router = useRouter();
  const loadProject = useCanvasStore((s) => s.loadProject);
  const getProject = useProjectStore((s) => s.getProject);
  const saveActiveProject = useProjectStore((s) => s.saveActiveProject);
  const setActiveProject = useProjectStore((s) => s.setActiveProject);
  const isDarkMode = useUIStore((s) => s.isDarkMode);

  useCloudSync(projectId);

  const saveNow = () => {
    const data = useCanvasStore.getState().toProjectData();
    saveActiveProject(data);
  };

  // Load project on mount
  useEffect(() => {
    const project = getProject(projectId);
    if (!project) {
      log.error("Project not found", projectId);
      router.push("/");
      return;
    }
    loadProject(project);
    setActiveProject(projectId);
    log.info("Loaded project", projectId);

    return () => {
      saveNow();
      setActiveProject(null);
    };
  }, [projectId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-save interval
  useEffect(() => {
    const timer = setInterval(saveNow, AUTO_SAVE_INTERVAL);
    return () => clearInterval(timer);
  }, [saveActiveProject]); // eslint-disable-line react-hooks/exhaustive-deps

  // Save before page unload
  useEffect(() => {
    window.addEventListener("beforeunload", saveNow);
    return () => window.removeEventListener("beforeunload", saveNow);
  }, [saveActiveProject]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      className={`w-full h-screen overflow-hidden select-none ${
        isDarkMode ? "bg-zinc-950 text-white" : "bg-slate-50 text-slate-900"
      }`}
    >
      <Canvas />
    </div>
  );
}
