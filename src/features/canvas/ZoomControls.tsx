"use client";

import { Plus, Minus, Maximize, Presentation } from "lucide-react";
import { useCanvasStore } from "@/stores/canvasStore";
import { useUIStore } from "@/stores/uiStore";

export function ZoomControls() {
  const camera = useCanvasStore((s) => s.camera);
  const setCamera = useCanvasStore((s) => s.setCamera);
  const { isDarkMode, setPresentationMode } = useUIStore();

  const zoomIn = () => {
    setCamera({ zoom: Math.min(camera.zoom * 1.3, 3) });
  };

  const zoomOut = () => {
    setCamera({ zoom: Math.max(camera.zoom / 1.3, 0.1) });
  };

  const fitAll = () => {
    const blocks = useCanvasStore.getState().blocks;
    if (blocks.length === 0) {
      setCamera({ x: 0, y: 0, zoom: 1 });
      return;
    }
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const block of blocks) {
      minX = Math.min(minX, block.position.x);
      minY = Math.min(minY, block.position.y);
      maxX = Math.max(maxX, block.position.x + block.width);
      maxY = Math.max(maxY, block.position.y + (block.height > 0 ? block.height : 80));
    }
    const padding = 100;
    const bboxWidth = maxX - minX + padding * 2;
    const bboxHeight = maxY - minY + padding * 2;
    const viewWidth = window.innerWidth;
    const viewHeight = window.innerHeight;
    const zoom = Math.min(viewWidth / bboxWidth, viewHeight / bboxHeight, 2);
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    setCamera({
      x: -centerX + viewWidth / 2 / zoom,
      y: -centerY + viewHeight / 2 / zoom,
      zoom,
    });
  };

  const btnClass = `p-2 rounded-lg transition-all ${
    isDarkMode
      ? "hover:bg-zinc-800 text-zinc-400"
      : "hover:bg-slate-200 text-slate-600"
  }`;

  return (
    <div
      className={`absolute bottom-4 right-4 z-50 flex flex-col gap-1 p-1 rounded-xl border backdrop-blur-md ${
        isDarkMode
          ? "bg-zinc-900/80 border-zinc-800"
          : "bg-white/80 border-slate-200"
      }`}
    >
      <button onClick={zoomIn} className={btnClass} title="Zoom in">
        <Plus size={18} />
      </button>
      <div
        className={`text-center text-xs py-1 ${
          isDarkMode ? "text-zinc-500" : "text-slate-400"
        }`}
      >
        {Math.round(camera.zoom * 100)}%
      </div>
      <button onClick={zoomOut} className={btnClass} title="Zoom out">
        <Minus size={18} />
      </button>
      <div
        className={`w-full h-px ${isDarkMode ? "bg-zinc-800" : "bg-slate-200"}`}
      />
      <button onClick={fitAll} className={btnClass} title="Fit all blocks">
        <Maximize size={18} />
      </button>
      <div
        className={`w-full h-px ${isDarkMode ? "bg-zinc-800" : "bg-slate-200"}`}
      />
      <button
        onClick={() => {
          document.documentElement.requestFullscreen?.();
          setPresentationMode(true);
        }}
        className={btnClass}
        title="Presentation mode"
      >
        <Presentation size={18} />
      </button>
    </div>
  );
}
