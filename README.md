# infiniteMDBoard

Infinite canvas markdown board — create, organize, and connect markdown notes and images on an infinite zoomable canvas.

## Features

<!-- Keep in sync with APP_FEATURES in src/lib/config.ts -->

- **Markdown blocks** — full GFM support (tables, checkboxes, code blocks) with live preview
- **Image blocks** — URL or drag-and-drop, optional click-through link
- **Link preview blocks** — auto-fetches title, description, favicon, OG image
- **Sticky notes & frames** — colored notes (5 colors) and frames that group child blocks
- **Block shapes & colors** — rectangle, oval, diamond, parallelogram for flowcharts
- **Arrow connections** — editable labels and styles (arrow, bidirectional, blocker)
- **Embed mode** — toggle link blocks between preview and iframe (YouTube/Vimeo auto-detect)
- **AI tools** — per-block formatting, CZ↔EN translation, and custom prompts via Gemini
- **Search, minimap & zoom** — Cmd+F search, minimap, infinite pan & zoom (scroll, pinch, double-click)
- **Export** — JSON (single / all), PNG, PDF
- **Undo / redo** — Ctrl+Z / Ctrl+Shift+Z with full history
- **Multi-select & duplicate** — Shift+click, Ctrl+D, drag via grip or Space+click
- **Presentation mode** — fullscreen with hidden UI, Esc to exit
- **Dark & light theme**
- **Multiple projects** — auto-save to localStorage, import/export

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
