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
- **AI format, translate & custom prompts** — per-block AI actions via Gemini (bring your own API key)
- **Block search** (Cmd+F) — live filtering with jump-to-block
- **Minimap** — overview panel with click-to-navigate
- **Export** to JSON / PNG / PDF
- **Undo/Redo** (Ctrl+Z / Ctrl+Shift+Z)
- **Multi-select** — Shift+click, Delete to remove, Ctrl+D to duplicate
- **Presentation mode** — fullscreen with hidden UI, Esc to exit
- **Dark/Light theme**
- **User accounts** — sign in with Google OAuth or magic link (email)
- **Cloud storage** — auto-sync projects to Supabase with localStorage as instant cache
- **Project sharing** — share via link, recipients get their own independent copy
- **Per-user AI key** — Gemini API key stored encrypted (AES-256-GCM) in your profile

## Tech Stack

Next.js 16 | React 19 | TypeScript | Zustand 5 | Tailwind CSS 4 | Supabase (Auth + Postgres) | Zod 4

## Getting Started

```bash
pnpm install
cp .env.local.example .env.local   # fill in values
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment Variables

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public key |
| `ENCRYPTION_KEY` | 32-byte hex string (64 chars) for AES-256-GCM encryption of user API keys |

Generate an encryption key: `openssl rand -hex 32`

### Supabase Setup

1. Create a Supabase project
2. Run the migration: `supabase db push` or execute `supabase/migrations/001_initial.sql` in the SQL editor
3. Enable Google OAuth in Authentication → Providers (optional)
4. Set environment variables

## Deploy

```bash
vercel
```

Set the three environment variables in Vercel project settings.

## Project Structure

```
src/
├── app/                # Next.js App Router pages
│   ├── api/            # API routes (format, profile, sync)
│   ├── auth/           # OAuth callback
│   └── share/          # Share page
├── features/           # Feature modules
│   ├── auth/           # AuthModal, ProfileModal, ImportDialog
│   ├── blocks/         # Text, image, link, sticky, frame blocks
│   ├── canvas/         # Canvas, camera hooks, zoom controls
│   ├── connections/    # SVG arrow rendering
│   ├── projects/       # Dashboard & project cards
│   ├── share/          # ShareDialog
│   └── toolbar/        # Top toolbar
├── hooks/              # Custom hooks (useCloudSync)
├── stores/             # Zustand stores (canvas, project, auth, ui)
├── lib/                # Utilities (supabase, encryption, validation, logger)
└── types/              # Shared TypeScript types
```

## Support

If you find this project useful, consider buying me a coffee:

[![Buy Me a Coffee](https://img.shields.io/badge/Buy%20Me%20a%20Coffee-support-yellow?logo=buy-me-a-coffee)](https://buymeacoffee.com/vojtaflorian)
