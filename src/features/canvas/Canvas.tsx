"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useCanvasStore } from "@/stores/canvasStore";
import { getBlocksInFrame } from "@/lib/geometry";

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
import { useCamera } from "./hooks/useCamera";
import { useDragDrop } from "./hooks/useDragDrop";
import { APP_VERSION } from "@/lib/config";

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
  const setEditingBlock = useCanvasStore((s) => s.setEditingBlock);
  const setDraggingBlock = useCanvasStore((s) => s.setDraggingBlock);
  const setResizingBlock = useCanvasStore((s) => s.setResizingBlock);
  const setConnectingFrom = useCanvasStore((s) => s.setConnectingFrom);
  const moveBlock = useCanvasStore((s) => s.moveBlock);
  const resizeBlock = useCanvasStore((s) => s.resizeBlock);
  const { isDarkMode } = useUIStore();

  const searchOpen = useUIStore((s) => s.searchOpen);
  const setSearchOpen = useUIStore((s) => s.setSearchOpen);

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
        // Ctrl+wheel OR trackpad pinch = ZOOM
        const factor = 1.04;
        const delta = -e.deltaY;
        const newZoom =
          delta > 0
            ? currentCamera.zoom * factor
            : currentCamera.zoom / factor;
        useCanvasStore
          .getState()
          .setCamera({ zoom: Math.min(Math.max(newZoom, 0.1), 3) });
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
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
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

      if (activeTool === "select") {
        clearSelection();
        setEditingBlock(null);
        setConnectingFrom(null);
        // Left-click on empty canvas = pan
        startPanning(e.clientX, e.clientY);
      }
    },
    [activeTool, startPanning, clearSelection, setEditingBlock, setConnectingFrom],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
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
            blockStartSizeRef.current = { width: block.width, height: block.height };
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
    [isPanning, draggingBlockId, resizingBlockId, updatePanning, moveBlock, resizeBlock],
  );

  const handleMouseUp = useCallback(() => {
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
  }, [stopPanning, setDraggingBlock, setResizingBlock]);

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        target !== canvasRef.current &&
        !target.classList.contains("canvas-bg")
      ) {
        return;
      }
      // Zoom in by 1.5x on double click empty canvas
      const currentZoom = useCanvasStore.getState().camera.zoom;
      const newZoom = Math.min(currentZoom * 1.5, 3);
      useCanvasStore.getState().setCamera({ zoom: newZoom });
    },
    [],
  );

  const cursorStyle =
    isPanning
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
          backgroundSize: `${24 * camera.zoom}px ${24 * camera.zoom}px`,
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
      </div>

      {/* UI overlays */}
      <Toolbar />
      <ZoomControls />
      <Minimap />
      {searchOpen && <SearchOverlay onClose={() => setSearchOpen(false)} />}

      {/* Version & position info */}
      <div
        className={`absolute bottom-4 left-4 z-50 text-xs font-mono select-none ${
          isDarkMode ? "text-zinc-600" : "text-slate-400"
        }`}
      >
        v{APP_VERSION} | Zoom: {Math.round(camera.zoom * 100)}% | Position: {Math.round(camera.x)}, {Math.round(camera.y)}
      </div>
    </div>
  );
}
