# Block Shapes — Flowchart-Style Shapes for Any Block

## Overview

Add an optional `shape` property to every block that changes its visual outline. This turns the existing canvas into a flowchart-capable tool without introducing a new block type — any block (text, image, link, sticky, frame) can adopt any shape.

## Shapes

| Shape | CSS | Meaning | Default |
|-------|-----|---------|---------|
| `rect` | `border-radius: 12px` (current) | Action / step | Yes |
| `oval` | `border-radius: 9999px` | Start / End | |
| `diamond` | `clip-path: polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)` | Decision (if/else) | |
| `parallelogram` | `clip-path: polygon(15% 0%, 100% 0%, 85% 100%, 0% 100%)` | Input / Output | |

## UI — Shape Picker

- Position: top-left of block, on hover (same pattern as sticky color picker)
- Shows for ALL block types (sticky color picker remains in addition)
- 4 small icon buttons representing each shape
- Active shape gets highlighted border (like active sticky color)
- Default = `rect` (no shape field needed = backward compatible)

## Type Changes

```typescript
// src/types/index.ts
export type BlockShape = "rect" | "oval" | "diamond" | "parallelogram";

export interface Block {
  // ... existing fields
  shape?: BlockShape; // undefined = "rect" (default)
}
```

## Rendering — BlockRenderer.tsx

The block card `<div>` gets conditional CSS based on `block.shape`:

- `rect` / `undefined`: no change (current `rounded-xl`)
- `oval`: `rounded-full` (border-radius: 9999px), add vertical padding
- `diamond`: `clip-path: polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)`, content centered, extra padding
- `parallelogram`: `clip-path: polygon(15% 0%, 100% 0%, 85% 100%, 0% 100%)`, horizontal padding offset

### clip-path caveats

- `clip-path` clips `box-shadow` and `border` — use `filter: drop-shadow()` instead for diamond/parallelogram
- `backdrop-blur` may not work with clip-path — acceptable trade-off

## Arrow Edge Points — geometry.ts

Current `getEdgePoint()` assumes rectangular bounding box. For correct arrow attachment:

- `rect`: no change
- `oval`: intersect ray with ellipse equation
- `diamond`: intersect ray with rotated square edges
- `parallelogram`: intersect ray with skewed rect edges

This is a nice-to-have refinement — the current rectangular edge calc will still work acceptably for all shapes (arrows will just attach to the bounding box rather than the visible shape edge). Can be improved in a follow-up.

## Backward Compatibility

- `shape` is optional (`shape?: BlockShape`)
- Existing blocks without `shape` render exactly as before
- No migration needed — existing localStorage data works unchanged
- Export/import JSON includes `shape` if set

## Files to Change

1. **`src/types/index.ts`** — add `BlockShape` type, `shape?` field to `Block`
2. **`src/features/blocks/BlockRenderer.tsx`** — shape picker UI + clip-path/border-radius on card div
3. **`src/lib/config.ts`** — version bump
4. **`package.json`** — version bump
5. **`README.md`** — add shapes to feature list

## Out of Scope

- SVG shape rendering (using CSS clip-path instead)
- New block type (shapes are a property of existing blocks)
- Mermaid/diagram-as-code
- Edge point refinement for non-rect shapes (follow-up)
