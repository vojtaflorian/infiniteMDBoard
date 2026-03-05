export const APP_VERSION = "2.10.4";
export const APP_NAME = "infiniteMDBoard";

// --- Zoom ---
export const ZOOM_MIN = 0.1;
export const ZOOM_MAX = 3;
export const ZOOM_WHEEL_FACTOR = 1.04;
export const ZOOM_BUTTON_FACTOR = 1.3;
export const ZOOM_DBLCLICK_FACTOR = 1.5;
export const ZOOM_FIT_MAX = 2;

// --- Canvas ---
export const GRID_SIZE = 24;
export const FIT_ALL_PADDING = 100;

// --- Features (used in landing page + README) ---
export const APP_TAGLINE =
  "Infinite canvas for markdown notes, images, links, sticky notes and diagrams.";

export const APP_FEATURES: { short: string; detail: string }[] = [
  { short: "Markdown blocks with live preview", detail: "Text blocks with full Markdown support (GFM: tables, checkboxes, code blocks)" },
  { short: "Image blocks with click-through URL", detail: "Image blocks (URL or drag-and-drop, optional click-through link)" },
  { short: "Link previews with OG metadata", detail: "Link preview blocks (auto-fetches title, description, favicon, OG image)" },
  { short: "Sticky notes & frames", detail: "Sticky notes (5 colors) and frames that group and move child blocks together" },
  { short: "Block shapes & colors", detail: "Block shapes — rectangle, oval, diamond, parallelogram — for flowcharts" },
  { short: "Arrow connections", detail: "Arrow connections between blocks with labels and styles (arrow, bidirectional, blocker)" },
  { short: "Embed mode for links", detail: "Embed mode on link blocks — toggle between preview and iframe (YouTube/Vimeo auto-detect)" },
  { short: "AI format, translate & custom prompts", detail: "AI-powered formatting, CZ↔EN translation, and custom prompts via Gemini" },
  { short: "Search, minimap & zoom", detail: "Block search (Cmd+F), minimap with click-to-navigate, infinite pan & zoom" },
  { short: "Export to JSON / PNG / PDF", detail: "Export single project or all as JSON, PNG, or PDF" },
  { short: "Undo / redo", detail: "Undo/Redo (Ctrl+Z / Ctrl+Shift+Z) with full history" },
  { short: "Multi-select & duplicate", detail: "Multi-select (Shift+click), duplicate (Ctrl+D), drag via grip or Space+click" },
  { short: "Presentation mode", detail: "Fullscreen presentation mode with hidden UI, Esc to exit" },
  { short: "Dark & light theme", detail: "Dark and light theme toggle" },
  { short: "Multiple projects with auto-save", detail: "Multiple projects with auto-save to localStorage" },
];
