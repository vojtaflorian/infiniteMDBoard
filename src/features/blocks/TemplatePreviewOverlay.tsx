"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useCanvasStore } from "@/stores/canvasStore";
import { useUIStore } from "@/stores/uiStore";
import { findBlockByRef } from "@/lib/execution/templateResolver";

interface TemplatePreviewOverlayProps {
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
}

export function TemplatePreviewOverlay({ textareaRef }: TemplatePreviewOverlayProps) {
  const blocks = useCanvasStore((s) => s.blocks);
  const { isDarkMode } = useUIStore();
  const [tooltip, setTooltip] = useState<{ x: number; y: number; content: string } | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    // Get text content and cursor position relative to textarea
    const text = textarea.value;
    const rect = textarea.getBoundingClientRect();

    // Find {{...}} patterns and check if mouse is near one
    const regex = /\{\{([^}]+)\}\}/g;
    let match;
    const matches: { ref: string; start: number; end: number }[] = [];
    while ((match = regex.exec(text)) !== null) {
      matches.push({ ref: match[1], start: match.index, end: match.index + match[0].length });
    }

    if (matches.length === 0) {
      setTooltip(null);
      return;
    }

    // Create a mirror element to measure character positions
    const mirror = document.createElement("div");
    const styles = window.getComputedStyle(textarea);
    mirror.style.cssText = `
      position: absolute; visibility: hidden; white-space: pre-wrap; word-wrap: break-word;
      width: ${styles.width}; font: ${styles.font}; padding: ${styles.padding};
      border: ${styles.border}; line-height: ${styles.lineHeight};
      letter-spacing: ${styles.letterSpacing};
    `;

    for (const m of matches) {
      // Measure position of the match
      mirror.textContent = text.slice(0, m.start);
      document.body.appendChild(mirror);
      const preRect = mirror.getBoundingClientRect();

      mirror.textContent = text.slice(0, m.end);
      const postRect = mirror.getBoundingClientRect();
      document.body.removeChild(mirror);

      const matchX = rect.left + (preRect.width % parseFloat(styles.width));
      const matchY = rect.top + preRect.height - textarea.scrollTop;
      const matchEndX = rect.left + (postRect.width % parseFloat(styles.width));

      if (e.clientX >= matchX - 5 && e.clientX <= matchEndX + 5 &&
          e.clientY >= matchY - 5 && e.clientY <= matchY + parseFloat(styles.lineHeight) + 5) {
        // Resolve the reference
        const sourceBlock = findBlockByRef(m.ref, blocks);
        let content = "";
        if (sourceBlock) {
          if (sourceBlock.type === "ai-input") content = sourceBlock.content;
          else content = sourceBlock.executionOutput ?? "";
        }
        const preview = content ? content.slice(0, 300) + (content.length > 300 ? "..." : "") : "(no output yet)";

        setTooltip({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top - 40,
          content: preview,
        });
        return;
      }
    }
    setTooltip(null);
  }, [textareaRef, blocks]);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const handleLeave = () => setTooltip(null);
    textarea.addEventListener("mousemove", handleMouseMove);
    textarea.addEventListener("mouseleave", handleLeave);
    return () => {
      textarea.removeEventListener("mousemove", handleMouseMove);
      textarea.removeEventListener("mouseleave", handleLeave);
    };
  }, [textareaRef, handleMouseMove]);

  if (!tooltip) return null;

  return (
    <div
      ref={overlayRef}
      className={`absolute z-30 max-w-[300px] px-3 py-2 rounded-lg shadow-lg text-xs font-mono whitespace-pre-wrap break-words pointer-events-none ${
        isDarkMode ? "bg-zinc-800 border border-zinc-700 text-zinc-300" : "bg-slate-800 text-white"
      }`}
      style={{ left: tooltip.x, top: tooltip.y, maxHeight: 150, overflow: "hidden" }}
    >
      {tooltip.content}
    </div>
  );
}
