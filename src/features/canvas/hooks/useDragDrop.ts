"use client";

import { useCallback } from "react";
import { useCanvasStore } from "@/stores/canvasStore";
import { screenToWorld, isPointInBlock } from "@/lib/geometry";
import { createLogger } from "@/lib/logger";

const log = createLogger("dragDrop");

const MAX_IMAGE_SIZE = 800;
const IMAGE_QUALITY = 0.7;

/** Compress an image file to a smaller JPEG data URL */
function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      // Scale down if too large
      if (width > MAX_IMAGE_SIZE || height > MAX_IMAGE_SIZE) {
        const ratio = Math.min(MAX_IMAGE_SIZE / width, MAX_IMAGE_SIZE / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Failed to get canvas context"));
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      const dataUrl = canvas.toDataURL("image/jpeg", IMAGE_QUALITY);
      URL.revokeObjectURL(img.src);
      resolve(dataUrl);
    };
    img.onerror = () => {
      URL.revokeObjectURL(img.src);
      reject(new Error("Failed to load image"));
    };
    img.src = URL.createObjectURL(file);
  });
}

export function useDragDrop(canvasRef: React.RefObject<HTMLDivElement | null>) {
  const addBlock = useCanvasStore((s) => s.addBlock);
  const updateBlock = useCanvasStore((s) => s.updateBlock);
  const camera = useCanvasStore((s) => s.camera);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (!canvasRef.current) return;

      const rect = canvasRef.current.getBoundingClientRect();
      const worldPos = screenToWorld(e.clientX, e.clientY, camera, rect);
      const files = Array.from(e.dataTransfer.files);

      for (const file of files) {
        if (file.type.startsWith("image/")) {
          // Image file → image block (or replace existing)
          const blocks = useCanvasStore.getState().blocks;
          const targetImageBlock = blocks.find(
            (b) => b.type === "image" && isPointInBlock(worldPos, b),
          );

          compressImage(file)
            .then((dataUrl) => {
              if (targetImageBlock) {
                updateBlock(targetImageBlock.id, {
                  content: dataUrl,
                  title: file.name || "Dropped Image",
                });
                log.info("Replaced image in block", targetImageBlock.id, `(${Math.round(dataUrl.length / 1024)}KB)`);
              } else {
                const blockId = addBlock("image", worldPos, {
                  content: dataUrl,
                  title: file.name || "Dropped Image",
                });
                useCanvasStore.getState().setEditingBlock(null);
                log.info("Dropped image", file.name, `block=${blockId}`, `(${Math.round(dataUrl.length / 1024)}KB)`);
              }
            })
            .catch((err) => {
              log.error("Failed to process dropped image", err);
            });
        } else if (
          file.type === "text/plain" ||
          file.type === "text/markdown" ||
          file.name.endsWith(".md") ||
          file.name.endsWith(".txt")
        ) {
          // Text/markdown file → text block
          file.text().then((text) => {
            const blockId = addBlock("text", worldPos, {
              content: text,
              title: file.name.replace(/\.(md|txt)$/, ""),
            });
            useCanvasStore.getState().setEditingBlock(null);
            log.info("Dropped text file", file.name, `block=${blockId}`);
          }).catch((err) => {
            log.error("Failed to read text file", err);
          });
        }
      }
    },
    [addBlock, updateBlock, camera, canvasRef],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  return { handleDrop, handleDragOver };
}
