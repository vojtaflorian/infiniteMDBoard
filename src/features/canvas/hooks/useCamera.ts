"use client";

import { useCallback, useRef } from "react";
import { useCanvasStore } from "@/stores/canvasStore";

export function useCamera() {
  const camera = useCanvasStore((s) => s.camera);
  const setCamera = useCanvasStore((s) => s.setCamera);
  const setIsPanning = useCanvasStore((s) => s.setIsPanning);
  const lastMousePos = useRef<{ x: number; y: number } | null>(null);

  const startPanning = useCallback(
    (clientX: number, clientY: number) => {
      lastMousePos.current = { x: clientX, y: clientY };
      setIsPanning(true);
    },
    [setIsPanning],
  );

  const updatePanning = useCallback(
    (clientX: number, clientY: number) => {
      if (!lastMousePos.current) return;
      const dx = clientX - lastMousePos.current.x;
      const dy = clientY - lastMousePos.current.y;
      lastMousePos.current = { x: clientX, y: clientY };
      const cam = useCanvasStore.getState().camera;
      useCanvasStore.getState().setCamera({
        x: cam.x + dx / cam.zoom,
        y: cam.y + dy / cam.zoom,
      });
    },
    [],
  );

  const stopPanning = useCallback(() => {
    lastMousePos.current = null;
    setIsPanning(false);
  }, [setIsPanning]);

  return {
    camera,
    setCamera,
    startPanning,
    updatePanning,
    stopPanning,
    lastMousePos,
  };
}
