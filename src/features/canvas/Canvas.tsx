"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useCanvasStore } from "@/stores/canvasStore";
import { getBlocksInFrame, getRenderedBlockHeight } from "@/lib/geometry";

// Module-level spacebar state — consumed by BlockRenderer for spacebar+click drag
let _spaceHeld = false;
export function isSpaceHeld(): boolean {
  return _spaceHeld;
}
import { useUIStore } from "@/stores/uiStore";
import { BlockRenderer } from "@/features/blocks/BlockRenderer";
import { ConnectionLayer } from "@/features/connections/ConnectionLayer";
import { Toolbar } from "@/features/toolbar/Toolbar";
import { ZoomControls } from "./ZoomControls";
import { Minimap } from "./Minimap";
import { SearchOverlay } from "./SearchOverlay";
import { CanvasEmptyState } from "./CanvasEmptyState";
import { useCamera } from "./hooks/useCamera";
import { useDragDrop } from "./hooks/useDragDrop";
import { APP_VERSION, ZOOM_MIN, ZOOM_MAX, ZOOM_WHEEL_FACTOR, ZOOM_DBLCLICK_FACTOR, GRID_SIZE } from "@/lib/config";

export function Canvas() {
  const canvasRef = useRef<HTMLDivElement>(null);
  const {
    camera,
    startPanning,
    updatePanning,
    stopPanning,
  } = useCamera();
  const { handleDrop, handleDragOver } = useDragDrop(canvasRef);

  const blocks = useCanvasStore((s) => s.blocks);
  const activeTool = useCanvasStore((s) => s.activeTool);
  const isPanning = useCanvasStore((s) => s.isPanning);
  const draggingBlockId = useCanvasStore((s) => s.draggingBlockId);
  const resizingBlockId = useCanvasStore((s) => s.resizingBlockId);
  const clearSelection = useCanvasStore((s) => s.clearSelection);
  const toggleSelectBlock = useCanvasStore((s) => s.toggleSelectBlock);
  const setEditingBlock = useCanvasStore((s) => s.setEditingBlock);
  const setDraggingBlock = useCanvasStore((s) => s.setDraggingBlock);
  const setResizingBlock = useCanvasStore((s) => s.setResizingBlock);
  const setConnectingFrom = useCanvasStore((s) => s.setConnectingFrom);
  const pendingConnection = useCanvasStore((s) => s.pendingConnection);
  const updatePendingConnectionTarget = useCanvasStore((s) => s.updatePendingConnectionTarget);
  const setPendingConnection = useCanvasStore((s) => s.setPendingConnection);
  const moveBlock = useCanvasStore((s) => s.moveBlock);
  const resizeBlock = useCanvasStore((s) => s.resizeBlock);
  const { isDarkMode } = useUIStore();
  const presentationMode = useUIStore((s) => s.presentationMode);
  const setPresentationMode = useUIStore((s) => s.setPresentationMode);

  const searchOpen = useUIStore((s) => s.searchOpen);
  const setSearchOpen = useUIStore((s) => s.setSearchOpen);

  const [marqueeRect, setMarqueeRect] = useState<{ startX: number; startY: number; endX: number; endY: number } | null>(null);

  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const blockStartPosRef = useRef<{ x: number; y: number } | null>(null);
  const resizeStartRef = useRef<{ x: number; y: number } | null>(null);
  const blockStartSizeRef = useRef<{ width: number; height: number } | null>(null);
  // Saved pre-drag/resize state for single undo entry
  const preMoveStateRef = useRef<object | null>(null);
  const childStartPositionsRef = useRef<{ id: string; x: number; y: number }[] | null>(null);

  // Native wheel handler for passive: false
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;

    const handler = (e: WheelEvent) => {
      e.preventDefault();

      const currentCamera = useCanvasStore.getState().camera;

      if (e.ctrlKey || e.metaKey) {
        // Ctrl+wheel OR trackpad pinch = ZOOM toward cursor
        const delta = -e.deltaY;
        const oldZoom = currentCamera.zoom;
        const newZoom = Math.min(Math.max(
          delta > 0 ? oldZoom * ZOOM_WHEEL_FACTOR : oldZoom / ZOOM_WHEEL_FACTOR,
        ZOOM_MIN), ZOOM_MAX);
        const rect = el.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        useCanvasStore.getState().setCamera({
          zoom: newZoom,
          x: currentCamera.x + mx / newZoom - mx / oldZoom,
          y: currentCamera.y + my / newZoom - my / oldZoom,
        });
      } else {
        // Plain wheel = PAN
        useCanvasStore.getState().setCamera({
          x: currentCamera.x - e.deltaX / currentCamera.zoom,
          y: currentCamera.y - e.deltaY / currentCamera.zoom,
        });
      }
    };

    el.addEventListener("wheel", handler, { passive: false });
    return () => el.removeEventListener("wheel", handler);
  }, []);

  // Exit presentation mode when leaving fullscreen (Escape)
  useEffect(() => {
    const handler = () => {
      if (!document.fullscreenElement) {
        setPresentationMode(false);
      }
    };
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, [setPresentationMode]);

  // Keyboard shortcuts + spacebar tracking
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        // Only track spacebar when not typing in an input/textarea
        const tag = (e.target as HTMLElement).tagName;
        if (tag !== "INPUT" && tag !== "TEXTAREA") {
          _spaceHeld = true;
        }
      }
      // Ignore key repeats for all shortcuts below
      if (e.repeat) return;
      if (e.key === "Escape") {
        const state = useCanvasStore.getState();
        if (state.pendingConnection) {
          state.setPendingConnection(null);
        } else if (state.activeTool !== "select") {
          state.setTool("select");
        } else if (state.connectingFromId) {
          state.setConnectingFrom(null);
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "f") {
        e.preventDefault();
        setSearchOpen(true);
      }
      // Delete/Backspace → delete selected blocks
      if (e.key === "Delete" || e.key === "Backspace") {
        const tag = (e.target as HTMLElement).tagName;
        if (tag !== "INPUT" && tag !== "TEXTAREA") {
          e.preventDefault();
          useCanvasStore.getState().deleteSelectedBlocks();
        }
      }
      // Ctrl/Cmd+D → duplicate selected blocks
      if ((e.ctrlKey || e.metaKey) && e.key === "d") {
        e.preventDefault();
        useCanvasStore.getState().duplicateSelectedBlocks();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        useCanvasStore.temporal.getState().undo();
      }
      if (
        (e.ctrlKey || e.metaKey) &&
        e.key === "z" &&
        e.shiftKey
      ) {
        e.preventDefault();
        useCanvasStore.temporal.getState().redo();
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        _spaceHeld = false;
      }
    };
    // Reset spacebar when window loses focus (e.g. Cmd+Tab while holding space)
    const handleBlur = () => { _spaceHeld = false; };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", handleBlur);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", handleBlur);
    };
  }, []);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      // Only handle clicks on canvas background
      const target = e.target as HTMLElement;
      if (target !== canvasRef.current && !target.classList.contains("canvas-bg")) {
        return;
      }

      // Middle-click always pans
      if (e.button === 1) {
        startPanning(e.clientX, e.clientY);
        return;
      }

      if (activeTool === "connect") {
        // Click on empty canvas cancels connect tool
        useCanvasStore.getState().setTool("select");
        return;
      }

      // Cancel pending connection on empty canvas click
      if (pendingConnection) {
        setPendingConnection(null);
        return;
      }

      if (activeTool === "select" && e.shiftKey) {
        // Start marquee select
        const cam = useCanvasStore.getState().camera;
        const worldX = e.clientX / cam.zoom - cam.x;
        const worldY = e.clientY / cam.zoom - cam.y;
        setMarqueeRect({ startX: worldX, startY: worldY, endX: worldX, endY: worldY });
        return; // Don't pan
      }

      if (activeTool === "select") {
        clearSelection();
        setEditingBlock(null);
        setConnectingFrom(null);
        // Left-click on empty canvas = pan
        startPanning(e.clientX, e.clientY);
      }
    },
    [activeTool, pendingConnection, startPanning, clearSelection, setEditingBlock, setConnectingFrom, setPendingConnection],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (pendingConnection) {
        const zoom = useCanvasStore.getState().camera.zoom;
        const cam = useCanvasStore.getState().camera;
        const worldX = (e.clientX) / zoom - cam.x;
        const worldY = (e.clientY) / zoom - cam.y;
        updatePendingConnectionTarget(worldX, worldY);
        return; // Don't do other move handling while connecting
      }

      if (marqueeRect) {
        const cam = useCanvasStore.getState().camera;
        const worldX = e.clientX / cam.zoom - cam.x;
        const worldY = e.clientY / cam.zoom - cam.y;
        setMarqueeRect((prev) => prev ? { ...prev, endX: worldX, endY: worldY } : null);
        return;
      }

      if (isPanning) {
        updatePanning(e.clientX, e.clientY);
        return;
      }

      // Handle block resize
      if (resizingBlockId && canvasRef.current) {
        if (!resizeStartRef.current) {
          resizeStartRef.current = { x: e.clientX, y: e.clientY };
          const state = useCanvasStore.getState();
          const block = state.blocks.find((b) => b.id === resizingBlockId);
          if (block) {
            blockStartSizeRef.current = {
              width: block.width,
              height: block.height > 0 ? block.height : getRenderedBlockHeight(block),
            };
          }
          // Pause temporal — save pre-resize state for single undo entry
          preMoveStateRef.current = { blocks: state.blocks, connections: state.connections };
          useCanvasStore.temporal.getState().pause();
          return;
        }

        if (!blockStartSizeRef.current) return;

        const zoom = useCanvasStore.getState().camera.zoom;
        const dx = (e.clientX - resizeStartRef.current.x) / zoom;
        const dy = (e.clientY - resizeStartRef.current.y) / zoom;

        const block = useCanvasStore.getState().blocks.find((b) => b.id === resizingBlockId);
        const newWidth = blockStartSizeRef.current.width + dx;
        if (block?.type === "text") {
          resizeBlock(resizingBlockId, newWidth, 0);
        } else {
          resizeBlock(resizingBlockId, newWidth, blockStartSizeRef.current.height + dy);
        }
        return;
      }

      if (draggingBlockId && canvasRef.current) {
        if (!dragStartRef.current) {
          dragStartRef.current = { x: e.clientX, y: e.clientY };
          const state = useCanvasStore.getState();
          const block = state.blocks.find((b) => b.id === draggingBlockId);
          if (block) {
            blockStartPosRef.current = { ...block.position };
            if (block.type === "frame") {
              const children = getBlocksInFrame(block, state.blocks);
              childStartPositionsRef.current = children.map((c) => ({ id: c.id, ...c.position }));
            } else {
              childStartPositionsRef.current = null;
            }
          }
          // Pause temporal — save pre-drag state for single undo entry
          preMoveStateRef.current = { blocks: state.blocks, connections: state.connections };
          useCanvasStore.temporal.getState().pause();
          return;
        }

        if (!blockStartPosRef.current) return;

        const zoom = useCanvasStore.getState().camera.zoom;
        const dx = (e.clientX - dragStartRef.current.x) / zoom;
        const dy = (e.clientY - dragStartRef.current.y) / zoom;

        const draggedBlock = useCanvasStore.getState().blocks.find((b) => b.id === draggingBlockId);
        if (draggedBlock?.type === "frame" && childStartPositionsRef.current) {
          moveBlock(draggingBlockId, {
            x: blockStartPosRef.current.x + dx,
            y: blockStartPosRef.current.y + dy,
          });
          for (const child of childStartPositionsRef.current) {
            moveBlock(child.id, { x: child.x + dx, y: child.y + dy });
          }
        } else {
          moveBlock(draggingBlockId, {
            x: blockStartPosRef.current.x + dx,
            y: blockStartPosRef.current.y + dy,
          });
        }
      }
    },
    [isPanning, pendingConnection, draggingBlockId, resizingBlockId, marqueeRect, updatePanning, updatePendingConnectionTarget, moveBlock, resizeBlock],
  );

  const handleMouseUp = useCallback(() => {
    // Complete marquee selection
    if (marqueeRect) {
      const x1 = Math.min(marqueeRect.startX, marqueeRect.endX);
      const y1 = Math.min(marqueeRect.startY, marqueeRect.endY);
      const x2 = Math.max(marqueeRect.startX, marqueeRect.endX);
      const y2 = Math.max(marqueeRect.startY, marqueeRect.endY);

      const { blocks: allBlocks } = useCanvasStore.getState();
      const selectedIds: string[] = [];
      for (const block of allBlocks) {
        const bx1 = block.position.x;
        const by1 = block.position.y;
        const bx2 = block.position.x + block.width;
        const by2 = block.position.y + (block.height > 0 ? block.height : 100);
        if (bx1 < x2 && bx2 > x1 && by1 < y2 && by2 > y1) {
          selectedIds.push(block.id);
        }
      }

      if (selectedIds.length > 0) {
        clearSelection();
        for (const id of selectedIds) {
          toggleSelectBlock(id);
        }
      }

      setMarqueeRect(null);
      return;
    }

    // Finalize drag/resize: resume tracking + push single undo entry
    if (preMoveStateRef.current) {
      const temporal = useCanvasStore.temporal;
      temporal.getState().resume();
      // Push pre-move state as a single undo entry (start → end in one step)
      const pastStates = temporal.getState().pastStates;
      temporal.setState({
        pastStates: [...pastStates, preMoveStateRef.current],
        futureStates: [],
      });
      preMoveStateRef.current = null;
    }

    stopPanning();
    setDraggingBlock(null);
    setResizingBlock(null);
    dragStartRef.current = null;
    blockStartPosRef.current = null;
    resizeStartRef.current = null;
    blockStartSizeRef.current = null;
    childStartPositionsRef.current = null;
  }, [stopPanning, setDraggingBlock, setResizingBlock, marqueeRect, clearSelection, toggleSelectBlock]);

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        target !== canvasRef.current &&
        !target.classList.contains("canvas-bg")
      ) {
        return;
      }
      // Zoom in by 1.5x toward double-click position
      const cam = useCanvasStore.getState().camera;
      const oldZoom = cam.zoom;
      const newZoom = Math.min(oldZoom * ZOOM_DBLCLICK_FACTOR, ZOOM_MAX);
      const rect = canvasRef.current!.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      useCanvasStore.getState().setCamera({
        zoom: newZoom,
        x: cam.x + mx / newZoom - mx / oldZoom,
        y: cam.y + my / newZoom - my / oldZoom,
      });
    },
    [],
  );

  const cursorStyle =
    marqueeRect
      ? "cursor-crosshair"
      : isPanning
        ? "cursor-grab"
        : activeTool === "connect"
          ? "cursor-crosshair"
          : "cursor-default";

  return (
    <div
      ref={canvasRef}
      data-canvas
      className={`relative w-full h-screen overflow-hidden ${cursorStyle} ${
        isDarkMode ? "bg-zinc-950" : "bg-slate-50"
      }`}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onDoubleClick={handleDoubleClick}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
      {/* Grid / Background */}
      <div
        className="canvas-bg absolute inset-0"
        style={{
          backgroundImage: isDarkMode
            ? "radial-gradient(circle, #27272a 1px, transparent 1px)"
            : "radial-gradient(circle, #cbd5e1 1px, transparent 1px)",
          backgroundSize: `${GRID_SIZE * camera.zoom}px ${GRID_SIZE * camera.zoom}px`,
          backgroundPosition: `${camera.x * camera.zoom}px ${camera.y * camera.zoom}px`,
        }}
      />

      {/* Transformed layer */}
      <div
        style={{
          transform: `translate(${camera.x * camera.zoom}px, ${camera.y * camera.zoom}px) scale(${camera.zoom})`,
          transformOrigin: "0 0",
        }}
      >
        <ConnectionLayer />
        {blocks.map((block) => (
          <BlockRenderer key={block.id} block={block} />
        ))}
        {marqueeRect && (
          <div
            className="absolute border-2 border-blue-500/50 bg-blue-500/10 pointer-events-none z-[100]"
            style={{
              left: Math.min(marqueeRect.startX, marqueeRect.endX),
              top: Math.min(marqueeRect.startY, marqueeRect.endY),
              width: Math.abs(marqueeRect.endX - marqueeRect.startX),
              height: Math.abs(marqueeRect.endY - marqueeRect.startY),
            }}
          />
        )}
      </div>

      {/* UI overlays */}
      {!presentationMode && blocks.length === 0 && <CanvasEmptyState />}
      {!presentationMode && <Toolbar />}
      <ZoomControls />
      <Minimap />
      {!presentationMode && searchOpen && <SearchOverlay onClose={() => setSearchOpen(false)} />}
      {!presentationMode && (
        <div
          className={`absolute bottom-4 left-4 z-50 text-xs font-mono select-none ${
            isDarkMode ? "text-zinc-600" : "text-slate-400"
          }`}
        >
          v{APP_VERSION} | Zoom: {Math.round(camera.zoom * 100)}% | Position: {Math.round(camera.x)}, {Math.round(camera.y)}
        </div>
      )}

      {/* Presentation mode exit hint */}
      {presentationMode && (
        <button
          onClick={() => {
            document.exitFullscreen?.();
            setPresentationMode(false);
          }}
          className={`absolute top-4 left-1/2 -translate-x-1/2 z-50 px-3 py-1.5 rounded-lg text-xs font-medium opacity-0 hover:opacity-100 transition-opacity ${
            isDarkMode
              ? "bg-zinc-800/80 text-zinc-400 hover:text-zinc-200"
              : "bg-white/80 text-slate-500 hover:text-slate-700"
          } backdrop-blur-sm`}
        >
          Press Esc to exit
        </button>
      )}
    </div>
  );
}
