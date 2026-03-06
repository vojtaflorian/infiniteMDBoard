"use client";

import { useEffect, useRef, useCallback } from "react";
import { useAuthStore } from "@/stores/authStore";
import { useProjectStore } from "@/stores/projectStore";
import { useCanvasStore } from "@/stores/canvasStore";
import { upsertProject } from "@/lib/supabase/projects";
import { createLogger } from "@/lib/logger";

const log = createLogger("cloudSync");
const CLOUD_SYNC_INTERVAL = 5000;

export function useCloudSync(projectId: string) {
  const user = useAuthStore((s) => s.user);
  const getProject = useProjectStore((s) => s.getProject);
  const lastVersionRef = useRef(0);
  const dirtyVersionRef = useRef(0);

  // Track data mutations via subscribe (no canvasStore modification needed)
  useEffect(() => {
    let prev = {
      blocks: useCanvasStore.getState().blocks,
      connections: useCanvasStore.getState().connections,
    };
    const unsub = useCanvasStore.subscribe((state) => {
      if (state.blocks !== prev.blocks || state.connections !== prev.connections) {
        dirtyVersionRef.current++;
        prev = { blocks: state.blocks, connections: state.connections };
      }
    });
    return unsub;
  }, []);

  const syncToCloud = useCallback(async () => {
    if (!user) return;
    if (dirtyVersionRef.current === lastVersionRef.current) return;

    const project = getProject(projectId);
    if (!project) return;

    const data = useCanvasStore.getState().toProjectData();
    const success = await upsertProject(projectId, project.name, data);
    if (success) {
      lastVersionRef.current = dirtyVersionRef.current;
      log.debug("Synced to cloud", projectId);
    }
  }, [user, projectId, getProject]);

  // Interval sync
  useEffect(() => {
    if (!user) return;
    const timer = setInterval(syncToCloud, CLOUD_SYNC_INTERVAL);
    return () => clearInterval(timer);
  }, [user, syncToCloud]);

  // Sync on page unload via sendBeacon (guaranteed delivery)
  useEffect(() => {
    if (!user) return;
    const handleUnload = () => {
      if (dirtyVersionRef.current === lastVersionRef.current) return;
      const project = getProject(projectId);
      if (!project) return;
      const data = useCanvasStore.getState().toProjectData();
      const payload = JSON.stringify({
        projectId,
        name: project.name,
        data,
      });
      navigator.sendBeacon("/api/sync", new Blob([payload], { type: "application/json" }));
    };
    window.addEventListener("beforeunload", handleUnload);
    return () => window.removeEventListener("beforeunload", handleUnload);
  }, [user, projectId, getProject]);

  return { syncToCloud };
}
