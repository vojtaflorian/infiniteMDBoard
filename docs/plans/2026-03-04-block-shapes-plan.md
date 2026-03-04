# Block Shapes Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add optional `shape` property to every block — rect (default), oval, diamond, parallelogram — with a shape picker UI on hover.

**Architecture:** New `BlockShape` type + `shape?` field on `Block`. CSS clip-path on card div in BlockRenderer. Shape picker UI positioned top-left (same pattern as sticky color picker). No new dependencies.

**Tech Stack:** TypeScript, React, Tailwind CSS, CSS clip-path

---

### Task 1: Add BlockShape type and shape field

**Files:**
- Modify: `src/types/index.ts:1,16-27`

**Step 1: Add BlockShape type and shape field to Block**

After the `ConnectionStyle` type (line 3), add:

```typescript
export type BlockShape = "rect" | "oval" | "diamond" | "parallelogram";
```

Add `shape?` field to `Block` interface (after `embed?: boolean` on line 26):

```typescript
  shape?: BlockShape;
```

**Step 2: Verify build**

Run: `pnpm build`
Expected: SUCCESS (shape is optional, no breaking changes)

**Step 3: Commit**

```bash
git add src/types/index.ts
git commit -m "feat: add BlockShape type and shape field to Block interface"
```

---

### Task 2: Shape picker UI in BlockRenderer

**Files:**
- Modify: `src/features/blocks/BlockRenderer.tsx:4,14,244-265`

**Step 1: Add shape icon imports and shape config**

Add to lucide-react import (line 4):
```typescript
import { GripVertical, Trash2, Maximize2, Globe, Code2, Sparkles, Copy, Square, Circle, Diamond, ArrowRightLeft } from "lucide-react";
```

Add `BlockShape` to the type import (line 14):
```typescript
import type { Block, BlockShape } from "@/types";
```

Add shape config constant after `stickyBgMap` (after line 24):

```typescript
const shapeOptions: { value: BlockShape; icon: typeof Square; label: string }[] = [
  { value: "rect", icon: Square, label: "Rectangle" },
  { value: "oval", icon: Circle, label: "Oval" },
  { value: "diamond", icon: Diamond, label: "Diamond" },
  { value: "parallelogram", icon: ArrowRightLeft, label: "Parallelogram" },
];
```

**Step 2: Add shape picker UI**

Replace the sticky-only color picker section (lines 244-265) with a shape picker for ALL blocks + color picker for sticky blocks:

```tsx
      {/* Shape picker (all blocks except frame) */}
      {block.type !== "frame" && (
        <div className="absolute -top-3 -left-3 z-10 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {shapeOptions.map(({ value, icon: Icon, label }) => (
            <button
              key={value}
              onClick={(e) => {
                e.stopPropagation();
                updateBlock(block.id, { shape: value === "rect" ? undefined : value });
              }}
              className={`w-5 h-5 flex items-center justify-center rounded border transition-transform hover:scale-125 ${
                isDarkMode
                  ? "bg-zinc-800 border-zinc-700 text-zinc-400"
                  : "bg-white border-slate-200 text-slate-500"
              } ${
                (block.shape ?? "rect") === value
                  ? isDarkMode
                    ? "border-blue-500 text-blue-400 scale-110"
                    : "border-blue-500 text-blue-500 scale-110"
                  : ""
              }`}
              title={label}
            >
              <Icon size={10} />
            </button>
          ))}
        </div>
      )}

      {/* Color picker (sticky blocks only) — positioned below shape picker */}
      {block.type === "sticky" && (
        <div className="absolute top-3 -left-3 z-10 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {(["yellow", "pink", "green", "blue", "purple"] as const).map(
            (c) => (
              <button
                key={c}
                onClick={(e) => {
                  e.stopPropagation();
                  updateBlock(block.id, { color: c });
                }}
                className={`w-4 h-4 rounded-full border-2 transition-transform hover:scale-125 ${stickyBgMap[c].split(" ")[0]} ${
                  block.color === c
                    ? "border-slate-700 scale-110"
                    : "border-transparent"
                }`}
                title={c}
              />
            ),
          )}
        </div>
      )}
```

**Step 3: Verify build**

Run: `pnpm build`
Expected: SUCCESS

**Step 4: Commit**

```bash
git add src/features/blocks/BlockRenderer.tsx
git commit -m "feat: add shape picker UI to all blocks"
```

---

### Task 3: Apply CSS clip-path/border-radius based on shape

**Files:**
- Modify: `src/features/blocks/BlockRenderer.tsx:267-306`

**Step 1: Add shape style helper**

Add helper function inside the component (after `const isEditing` on line 49):

```typescript
  const shape = block.shape ?? "rect";

  const getShapeStyles = (): { className: string; style: React.CSSProperties } => {
    switch (shape) {
      case "oval":
        return {
          className: "rounded-full",
          style: { padding: "1.5rem 2rem" },
        };
      case "diamond":
        return {
          className: "",
          style: {
            clipPath: "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)",
            padding: "3rem 2rem",
            textAlign: "center" as const,
          },
        };
      case "parallelogram":
        return {
          className: "",
          style: {
            clipPath: "polygon(12% 0%, 100% 0%, 88% 100%, 0% 100%)",
            padding: "1rem 2.5rem",
          },
        };
      default: // rect
        return { className: "rounded-xl", style: {} };
    }
  };

  const shapeStyles = getShapeStyles();
```

**Step 2: Apply shape styles to block card div**

Replace the block card div (line 268-290):

```tsx
      {/* Block card */}
      <div
        className={`${shape === "rect" ? "rounded-xl" : shapeStyles.className} p-4 border transition-all ${
          block.type === "frame"
            ? isDarkMode
              ? "bg-zinc-900/30 border-zinc-700 border-dashed"
              : "bg-slate-100/30 border-slate-300 border-dashed"
            : block.type === "sticky" && block.color
              ? stickyBgMap[block.color] ?? "bg-yellow-200 border-yellow-300"
              : isDarkMode
                ? "bg-zinc-900/90 border-zinc-800"
                : "bg-white/90 border-slate-200"
        } ${
          isSelected
            ? isDarkMode
              ? "ring-2 ring-blue-500/50 border-blue-500/30"
              : "ring-2 ring-blue-400/50 border-blue-400/30"
            : ""
        } ${isEditing ? "shadow-xl" : "shadow-lg"} ${shape === "rect" ? "backdrop-blur-sm" : ""}`}
        style={{
          ...shapeStyles.style,
          ...(block.type !== "text" && block.height > 0
            ? { height: block.height, overflowY: "auto" as const }
            : {}),
          ...(shape !== "rect" ? { filter: "drop-shadow(0 4px 6px rgba(0,0,0,0.1))" } : {}),
        }}
      >
```

Note: `backdrop-blur-sm` removed for non-rect shapes (doesn't work with clip-path). `box-shadow` replaced with `filter: drop-shadow()` for clipped shapes (shadow follows clip-path contour instead of bounding box).

**Step 3: Update connection overlay to match shape**

Replace the connection overlay div (line 308-317) to respect shape:

```tsx
      {/* Connection overlay when connect tool is active */}
      {activeTool === "connect" && (
        <div
          className={`absolute inset-0 ${shape === "rect" ? "rounded-xl" : ""} border-2 border-dashed pointer-events-none ${
            connectingFromId === block.id
              ? "border-purple-500 bg-purple-500/10"
              : "border-purple-300/50 hover:border-purple-400 hover:bg-purple-500/5"
          }`}
          style={shape !== "rect" ? { clipPath: shapeStyles.style.clipPath as string } : {}}
        />
      )}
```

**Step 4: Verify build**

Run: `pnpm build`
Expected: SUCCESS

**Step 5: Commit**

```bash
git add src/features/blocks/BlockRenderer.tsx
git commit -m "feat: apply CSS clip-path shapes to block cards"
```

---

### Task 4: Version bump + README + docs

**Files:**
- Modify: `src/lib/config.ts:1`
- Modify: `package.json:3`
- Modify: `README.md:11-12`

**Step 1: Bump version to 2.6.0**

`src/lib/config.ts`:
```typescript
export const APP_VERSION = "2.6.0";
```

`package.json`:
```json
"version": "2.6.0",
```

**Step 2: Update README features list**

Add after the "Frames" line (after line 11):

```markdown
- **Block shapes** — rectangle (default), oval, diamond, parallelogram — turn any block into a flowchart element
```

**Step 3: Verify build**

Run: `pnpm build`
Expected: SUCCESS

**Step 4: Commit**

```bash
git add src/lib/config.ts package.json README.md
git commit -m "feat: block shapes — flowchart-style shapes for any block (v2.6.0)"
```

---

## Verification Checklist

1. Create text block → default rectangle shape, no visual change
2. Hover on block → shape picker appears top-left (4 icons)
3. Click oval → block becomes pill-shaped
4. Click diamond → block becomes diamond (rotated square)
5. Click parallelogram → block gets skewed sides
6. Click rect → back to default rectangle
7. Shape works on text, image, link, sticky blocks
8. Frame blocks have no shape picker (always rect)
9. Sticky blocks: shape picker + color picker both visible
10. Connections still attach correctly to shaped blocks
11. `pnpm build` passes
