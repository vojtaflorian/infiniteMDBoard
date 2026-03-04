"use client";

import { useRef, useCallback, useMemo, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkBreaks from "remark-breaks";
import remarkGfm from "remark-gfm";
import TurndownService from "turndown";
import { gfm } from "turndown-plugin-gfm";
import {
  Bold,
  Italic,
  Heading1,
  Heading2,
  List,
  ListOrdered,
  CheckSquare,
  Code,
  Link as LinkIcon,
  Quote,
  Minus,
} from "lucide-react";
import { useCanvasStore } from "@/stores/canvasStore";
import { useUIStore } from "@/stores/uiStore";
import { createLogger } from "@/lib/logger";
import type { Block } from "@/types";

const log = createLogger("TextBlock");

interface TextBlockProps {
  block: Block;
  isEditing: boolean;
}

type FormatAction =
  | { type: "wrap"; before: string; after: string }
  | { type: "line"; prefix: string };

const formats: { icon: React.ReactNode; title: string; action: FormatAction }[] = [
  { icon: <Bold size={14} />, title: "Bold", action: { type: "wrap", before: "**", after: "**" } },
  { icon: <Italic size={14} />, title: "Italic", action: { type: "wrap", before: "_", after: "_" } },
  { icon: <Code size={14} />, title: "Inline code", action: { type: "wrap", before: "`", after: "`" } },
  { icon: <Heading1 size={14} />, title: "Heading 1", action: { type: "line", prefix: "# " } },
  { icon: <Heading2 size={14} />, title: "Heading 2", action: { type: "line", prefix: "## " } },
  { icon: <Quote size={14} />, title: "Quote", action: { type: "line", prefix: "> " } },
  { icon: <List size={14} />, title: "Bullet list", action: { type: "line", prefix: "- " } },
  { icon: <ListOrdered size={14} />, title: "Numbered list", action: { type: "line", prefix: "1. " } },
  { icon: <CheckSquare size={14} />, title: "Checkbox", action: { type: "line", prefix: "- [ ] " } },
  { icon: <LinkIcon size={14} />, title: "Link", action: { type: "wrap", before: "[", after: "](url)" } },
  { icon: <Minus size={14} />, title: "Divider", action: { type: "line", prefix: "---" } },
];

/**
 * Fix Google Docs HTML quirks before turndown conversion:
 * 1. <b style="font-weight:normal"> wrapper → unwrap
 * 2. Nested <ul>/<ol> as sibling of <li> → move inside preceding <li>
 * 3. <p role="presentation"> inside <li> → unwrap (prevents double newlines)
 */
function preprocessHtml(html: string): string {
  const doc = new DOMParser().parseFromString(html, "text/html");

  // 1. Unwrap <b style="font-weight:normal"> (Google Docs wrapper)
  doc.querySelectorAll("b").forEach((b) => {
    if (b.style.fontWeight === "normal") {
      const parent = b.parentNode;
      if (parent) {
        while (b.firstChild) parent.insertBefore(b.firstChild, b);
        parent.removeChild(b);
      }
    }
  });

  // 2. Fix invalid list nesting: <ul><li>A</li><ul><li>B</li></ul></ul>
  //    → move nested <ul>/<ol> inside preceding <li>
  doc
    .querySelectorAll("ul > ul, ul > ol, ol > ul, ol > ol")
    .forEach((nested) => {
      const prev = nested.previousElementSibling;
      if (prev?.tagName === "LI") {
        prev.appendChild(nested);
      }
    });

  // 3. Unwrap <p role="presentation"> inside <li> (Google Docs list items)
  doc.querySelectorAll('li > p[role="presentation"]').forEach((p) => {
    const parent = p.parentNode!;
    while (p.firstChild) parent.insertBefore(p.firstChild, p);
    parent.removeChild(p);
  });

  return doc.body.innerHTML;
}

export function TextBlock({ block, isEditing }: TextBlockProps) {
  const updateBlock = useCanvasStore((s) => s.updateBlock);
  const { isDarkMode } = useUIStore();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const turndown = useMemo(() => {
    const td = new TurndownService({
      headingStyle: "atx",
      bulletListMarker: "-",
      codeBlockStyle: "fenced",
      fence: "```",
    });
    td.use(gfm);

    // Google Docs: bold via inline style (<span style="font-weight:700">)
    td.addRule("styledBold", {
      filter: (node) => {
        if (node.nodeName !== "SPAN") return false;
        const fw = (node as HTMLElement).style.fontWeight;
        return fw === "bold" || fw === "700" || parseInt(fw) >= 700;
      },
      replacement: (content) => (content.trim() ? `**${content.trim()}**` : ""),
    });

    // Google Docs: italic via inline style
    td.addRule("styledItalic", {
      filter: (node) => {
        if (node.nodeName !== "SPAN") return false;
        return (node as HTMLElement).style.fontStyle === "italic";
      },
      replacement: (content) => (content.trim() ? `_${content.trim()}_` : ""),
    });

    // Google Docs: monospace font → inline code
    td.addRule("styledCode", {
      filter: (node) => {
        if (node.nodeName !== "SPAN") return false;
        const ff = (node as HTMLElement).style.fontFamily.toLowerCase();
        return /monospace|courier|consolas/.test(ff);
      },
      replacement: (content) => (content.trim() ? `\`${content.trim()}\`` : ""),
    });

    // Google Docs: strikethrough via inline style
    td.addRule("styledStrikethrough", {
      filter: (node) => {
        if (node.nodeName !== "SPAN") return false;
        return (node as HTMLElement).style.textDecoration.includes("line-through");
      },
      replacement: (content) =>
        content.trim() ? `~~${content.trim()}~~` : "",
    });

    return td;
  }, []);

  const handlePaste = useCallback(
    (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
      const html = e.clipboardData.getData("text/html");
      if (!html) return; // plain text paste — let browser handle it

      e.preventDefault();
      log.info("Paste HTML detected", { htmlLength: html.length, blockId: block.id });
      const cleaned = preprocessHtml(html);
      const raw = turndown.turndown(cleaned);
      const md = raw.replace(/\n{3,}/g, "\n\n").trim();
      log.debug("Paste converted to markdown", { mdLength: md.length });
      const ta = textareaRef.current;
      if (!ta) return;

      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const text = ta.value;
      const newText = text.slice(0, start) + md + text.slice(end);
      // Auto-fit width based on content
      const lines = md.split("\n");
      const maxLineLen = Math.max(...lines.map((l) => l.length));
      const fitWidth = Math.min(600, Math.max(block.width, maxLineLen * 7 + 40));
      updateBlock(block.id, { content: newText, ...(fitWidth !== block.width && { width: fitWidth }) });

      const cursorPos = start + md.length;
      requestAnimationFrame(() => {
        ta.focus();
        ta.selectionStart = cursorPos;
        ta.selectionEnd = cursorPos;
      });
    },
    [block.id, updateBlock, turndown],
  );

  const applyFormat = useCallback(
    (action: FormatAction) => {
      const ta = textareaRef.current;
      if (!ta) return;

      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const text = block.content;
      const selected = text.slice(start, end);

      let newText: string;
      let cursorPos: number;

      if (action.type === "wrap") {
        newText =
          text.slice(0, start) +
          action.before +
          selected +
          action.after +
          text.slice(end);
        cursorPos = selected
          ? start + action.before.length + selected.length + action.after.length
          : start + action.before.length;
      } else {
        // Line prefix — find start of current line
        const lineStart = text.lastIndexOf("\n", start - 1) + 1;
        newText =
          text.slice(0, lineStart) + action.prefix + text.slice(lineStart);
        cursorPos = start + action.prefix.length;
      }

      updateBlock(block.id, { content: newText });

      // Restore cursor position after React re-render
      requestAnimationFrame(() => {
        ta.focus();
        ta.selectionStart = cursorPos;
        ta.selectionEnd = cursorPos;
      });
    },
    [block.content, block.id, updateBlock],
  );

  // Auto-resize textarea to fit content
  useEffect(() => {
    if (!isEditing) return;
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "0";
    ta.style.height = `${ta.scrollHeight}px`;
  }, [isEditing, block.content]);

  if (isEditing) {
    return (
      <div className="flex flex-col gap-1 h-full">
        <div className="flex flex-wrap gap-0.5 -mx-1">
          {formats.map((f) => (
            <button
              key={f.title}
              onClick={(e) => {
                e.stopPropagation();
                applyFormat(f.action);
              }}
              onMouseDown={(e) => e.preventDefault()}
              className={`p-1 rounded transition-colors ${
                isDarkMode
                  ? "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800"
                  : "text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              }`}
              title={f.title}
            >
              {f.icon}
            </button>
          ))}
        </div>
        <textarea
          ref={textareaRef}
          autoFocus
          className={`w-full min-h-[120px] bg-transparent outline-none resize-none text-sm font-mono leading-relaxed ${
            isDarkMode ? "text-zinc-300" : "text-slate-700"
          }`}
          value={block.content}
          onChange={(e) => updateBlock(block.id, { content: e.target.value })}
          onPaste={handlePaste}
        />
      </div>
    );
  }

  return (
    <div
      className={`text-sm leading-relaxed prose prose-sm ${
        isDarkMode ? "prose-invert text-zinc-300" : "text-slate-700"
      } cursor-text`}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>
        {block.content}
      </ReactMarkdown>
    </div>
  );
}
