# infiniteMDBoard

Infinite canvas markdown board — create, organize, and connect markdown notes and images on an infinite zoomable canvas.

## Features

- **Text blocks** with full Markdown support (GFM: tables, checkboxes, code blocks)
- **Image blocks** (URL or drag-and-drop from OS, drop on existing image block to replace)
- **Link preview blocks** (paste URL → auto-fetches title, description, favicon, OG image)
- **Sticky notes** (colored notes: yellow, pink, green, blue, purple)
- **Block shapes** — rectangle (default), oval, diamond, parallelogram — turn any block into a flowchart element
- **Frames** — named sections that group and move child blocks together, with optional colored borders
- **Arrow connections** between blocks with editable labels and connection types (arrow, bidirectional, blocker)
- **Embed mode** on link blocks — toggle between preview card and iframe (YouTube/Vimeo auto-detect)
- **Block search** (Cmd+F) — live filtering with jump-to-block
- **Minimap** — overview panel with click-to-navigate
- **Block drag** via left-side grip handle or Spacebar+click anywhere on block
- **Editable project name** on canvas (click to rename)
- **Infinite canvas** with pan & zoom:
  - Ctrl+scroll / trackpad pinch = zoom
  - Scroll / trackpad two-finger = pan
  - Double-click empty space = zoom in
  - Floating +/−/Fit All controls
- **Multiple projects** with auto-save (localStorage)
- **JSON export/import** (single project or all)
- **PNG/PDF export** — export entire board as image or PDF
- **Block duplication** — duplicate any block with one click or Ctrl+D
- **Multi-select** — Shift+click to select multiple blocks, Delete to remove, Ctrl+D to duplicate all
- **AI Format** — per-block Sparkles button to clean up markdown via Gemini 2.5 Flash Lite
- **AI Translate** — per-block translate button (CZ↔EN bidirectional) via Gemini
- **Undo/Redo** (Ctrl+Z / Ctrl+Shift+Z)
- **Presentation mode** — fullscreen with hidden UI (toolbar, minimap, controls), Esc to exit
- **Dark/Light theme**

## Tech Stack

Next.js 16 | React 19 | TypeScript | Zustand 5 | Tailwind CSS 4 | react-markdown | zundo

## Getting Started

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Deploy

```bash
vercel
```

## Project Structure

```
src/
├── app/            # Next.js App Router pages
├── features/       # Feature modules
│   ├── blocks/     # Text & image block components
│   ├── canvas/     # Canvas, camera hooks, zoom controls
│   ├── connections/# SVG arrow rendering
│   ├── projects/   # Dashboard & project cards
│   └── toolbar/    # Top toolbar
├── stores/         # Zustand stores (canvas, project, ui)
├── lib/            # Utilities (logger, geometry, storage, id)
└── types/          # Shared TypeScript types
```

## Support

If you find this project useful, consider buying me a coffee:

[![Buy Me a Coffee](https://img.shields.io/badge/Buy%20Me%20a%20Coffee-support-yellow?logo=buy-me-a-coffee)](https://buymeacoffee.com/vojtaflorian)
