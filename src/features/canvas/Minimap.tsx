"use client";

import { useRef, useEffect, useCallback } from "react";
import { useCanvasStore } from "@/stores/canvasStore";
import { useUIStore } from "@/stores/uiStore";

const MAP_W = 180;
const MAP_H = 150;
const PADDING = 20;

const typeColors: Record<string, string> = {
  text: "#3b82f6",
  image: "#f59e0b",
  link: "#0ea5e9",
  sticky: "#eab308",
  frame: "#6b7280",
};

export function Minimap() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const blocks = useCanvasStore((s) => s.blocks);
  const camera = useCanvasStore((s) => s.camera);
  const setCamera = useCanvasStore((s) => s.setCamera);
  const { isDarkMode } = useUIStore();

  const draw = useCallback(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx || blocks.length === 0) return;

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const b of blocks) {
      minX = Math.min(minX, b.position.x);
      minY = Math.min(minY, b.position.y);
      maxX = Math.max(maxX, b.position.x + b.width);
      maxY = Math.max(maxY, b.position.y + (b.height > 0 ? b.height : 80));
    }

    const vpX = -camera.x;
    const vpY = -camera.y;
    const vpW = window.innerWidth / camera.zoom;
    const vpH = window.innerHeight / camera.zoom;
    minX = Math.min(minX, vpX) - PADDING;
    minY = Math.min(minY, vpY) - PADDING;
    maxX = Math.max(maxX, vpX + vpW) + PADDING;
    maxY = Math.max(maxY, vpY + vpH) + PADDING;

    const worldW = maxX - minX;
    const worldH = maxY - minY;
    const scale = Math.min(MAP_W / worldW, MAP_H / worldH);

    ctx.clearRect(0, 0, MAP_W, MAP_H);

    ctx.fillStyle = isDarkMode ? "rgba(24,24,27,0.8)" : "rgba(248,250,252,0.8)";
    ctx.fillRect(0, 0, MAP_W, MAP_H);

    for (const b of blocks) {
      const x = (b.position.x - minX) * scale;
      const y = (b.position.y - minY) * scale;
      const w = b.width * scale;
      const h = (b.height > 0 ? b.height : 80) * scale;
      ctx.fillStyle = typeColors[b.type] ?? "#6b7280";
      ctx.globalAlpha = b.type === "frame" ? 0.2 : 0.6;
      ctx.fillRect(x, y, Math.max(w, 2), Math.max(h, 2));
    }
    ctx.globalAlpha = 1;

    const vx = (vpX - minX) * scale;
    const vy = (vpY - minY) * scale;
    const vw = vpW * scale;
    const vh = vpH * scale;
    ctx.strokeStyle = isDarkMode ? "rgba(161,161,170,0.5)" : "rgba(100,116,139,0.5)";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(vx, vy, vw, vh);
  }, [blocks, camera, isDarkMode]);

  useEffect(() => { draw(); }, [draw]);

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (blocks.length === 0) return;

      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (const b of blocks) {
        minX = Math.min(minX, b.position.x);
        minY = Math.min(minY, b.position.y);
        maxX = Math.max(maxX, b.position.x + b.width);
        maxY = Math.max(maxY, b.position.y + (b.height > 0 ? b.height : 80));
      }
      const vpW = window.innerWidth / camera.zoom;
      const vpH = window.innerHeight / camera.zoom;
      minX = Math.min(minX, -camera.x) - PADDING;
      minY = Math.min(minY, -camera.y) - PADDING;
      maxX = Math.max(maxX, -camera.x + vpW) + PADDING;
      maxY = Math.max(maxY, -camera.y + vpH) + PADDING;

      const worldW = maxX - minX;
      const worldH = maxY - minY;
      const scale = Math.min(MAP_W / worldW, MAP_H / worldH);

      const rect = canvasRef.current!.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;

      const worldX = mx / scale + minX;
      const worldY = my / scale + minY;

      setCamera({
        x: -worldX + vpW / 2,
        y: -worldY + vpH / 2,
      });
    },
    [blocks, camera, setCamera],
  );

  if (blocks.length === 0) return null;

  return (
    <canvas
      ref={canvasRef}
      width={MAP_W}
      height={MAP_H}
      onClick={handleClick}
      className={`absolute bottom-4 right-16 z-50 rounded-lg border cursor-crosshair ${
        isDarkMode ? "border-zinc-700" : "border-slate-300"
      }`}
    />
  );
}
