import { create } from "zustand";
import { temporal } from "zundo";
import type {
  Block,
  BlockType,
  Camera,
  Connection,
  ExecutionState,
  Position,
  Project,
  Tool,
} from "@/types";
import { generateId } from "@/lib/id";
import { createLogger } from "@/lib/logger";
import { getDefaultAIConfig, getDefaultProvider } from "@/lib/execution/aiDefaults";

const log = createLogger("canvasStore");

// Debounce guard for duplicate operations
let lastDuplicateTime = 0;
const DUPLICATE_DEBOUNCE_MS = 300;

interface CanvasState {
  blocks: Block[];
  connections: Connection[];
  camera: Camera;
  activeTool: Tool;
  selectedBlockIds: string[];
  editingBlockId: string | null;
  draggingBlockId: string | null;
  resizingBlockId: string | null;
  connectingFromId: string | null;
  pendingConnection: { fromId: string; fromX: number; fromY: number; toX: number; toY: number } | null;
  isPanning: boolean;
  expandedBlockIds: string[];

  addBlock: (type: BlockType, position: Position, initial?: Partial<Block>) => string;
  updateBlock: (id: string, updates: Partial<Block>) => void;
  deleteBlock: (id: string) => void;
  duplicateBlock: (id: string) => string | null;
  moveBlock: (id: string, position: Position) => void;
  resizeBlock: (id: string, width: number, height: number) => void;
  addConnection: (fromId: string, toId: string) => void;
  updateConnection: (id: string, updates: Partial<Connection>) => void;
  deleteConnection: (id: string) => void;
  setCamera: (camera: Partial<Camera>) => void;
  setTool: (tool: Tool) => void;
  setSelectedBlock: (id: string | null) => void;
  toggleSelectBlock: (id: string) => void;
  clearSelection: () => void;
  deleteSelectedBlocks: () => void;
  duplicateSelectedBlocks: () => void;
  setEditingBlock: (id: string | null) => void;
  setDraggingBlock: (id: string | null) => void;
  setResizingBlock: (id: string | null) => void;
  setConnectingFrom: (id: string | null) => void;
  setPendingConnection: (data: { fromId: string; fromX: number; fromY: number; toX: number; toY: number } | null) => void;
  updatePendingConnectionTarget: (toX: number, toY: number) => void;
  setIsPanning: (panning: boolean) => void;
  toggleBlockExpanded: (id: string) => void;
  setBlockExecution: (id: string, state: ExecutionState, output?: string, error?: string, tokens?: { input: number; output: number }) => void;
  clearBlockExecution: (id: string) => void;
  insertWorkflow: (name: string, blocks: Block[], connections: Connection[]) => void;
  loadProject: (project: Project) => void;
  toProjectData: () => Pick<Project, "blocks" | "connections" | "camera">;
  reset: () => void;
}

const initialState = {
  blocks: [] as Block[],
  connections: [] as Connection[],
  camera: { x: 0, y: 0, zoom: 1 } as Camera,
  activeTool: "select" as Tool,
  selectedBlockIds: [] as string[],
  editingBlockId: null as string | null,
  draggingBlockId: null as string | null,
  resizingBlockId: null as string | null,
  connectingFromId: null as string | null,
  pendingConnection: null as { fromId: string; fromX: number; fromY: number; toX: number; toY: number } | null,
  isPanning: false,
  expandedBlockIds: [] as string[],
};

export const useCanvasStore = create<CanvasState>()(
  temporal(
    (set, get) => ({
      ...initialState,

      addBlock: (type, position, initial) => {
        const defaults: Record<BlockType, Partial<Block>> = {
          text:   { title: "Text",   content: "", width: 300 },
          image:  { title: "Image",  content: "https://media2.giphy.com/media/v1.Y2lkPTc5MGI3NjExbnJrZHZybmUzM2s2aWozd2Mya2txY21wajNrODF6em04bGtsa2U3dSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/cXSWlQ0j4Vta8/giphy.gif", width: 300 },
          link:   { title: "Link",   content: "", width: 340 },
          sticky: { title: "Note",   content: "", width: 220, color: "yellow" },
          frame:  { title: "Frame",  content: "", width: 720, height: 400 },
          "ai-agent": (() => {
            const provider = typeof window !== "undefined" ? getDefaultProvider() : "openai" as const;
            const defaults = typeof window !== "undefined" ? getDefaultAIConfig(provider) : { apiKeyId: "", model: "" };
            return {
              title: "AI Agent",
              content: "",
              width: 420,
              height: 0,
              aiConfig: {
                provider,
                model: defaults.model,
                apiKeyId: defaults.apiKeyId,
                systemPrompt: "",
                userPrompt: "",
                temperature: 1,
                maxTokens: 4096,
                responseFormat: "text",
              },
            };
          })(),
          "ai-input": {
            title: "Input",
            content: "",
            width: 360,
            height: 0,
            inputConfig: { format: "text" },
          },
          "ai-viewer": {
            title: "Viewer",
            content: "",
            width: 480,
            height: 300,
            viewerConfig: { renderMode: "text" },
          },
        };
        const d = defaults[type];
        const { width: _w, title: _t, content: _c, color: _co, ...extraDefaults } = d;
        // Generate unique title for AI blocks
        const baseTitle = d.title ?? "";
        let title = baseTitle;
        if (type.startsWith("ai-")) {
          const existing = get().blocks.filter((b) => b.type === type);
          const n = existing.length + 1;
          title = `${baseTitle} ${n}`;
        }
        const block: Block = {
          id: generateId(),
          type,
          position,
          width: d.width ?? 250,
          height: d.height ?? 0,
          title,
          content: d.content ?? "",
          color: d.color,
          ...extraDefaults,
          zIndex: get().blocks.length + 1,
          ...initial,
        };
        log.info("Added block", block.id);
        set((s) => ({
          blocks: [...s.blocks, block],
          editingBlockId: block.id,
          expandedBlockIds: type.startsWith("ai-") ? [...s.expandedBlockIds, block.id] : s.expandedBlockIds,
        }));
        return block.id;
      },

      updateBlock: (id, updates) => {
        set((s) => ({
          blocks: s.blocks.map((b) =>
            b.id === id ? { ...b, ...updates } : b,
          ),
        }));
      },

      deleteBlock: (id) => {
        log.info("Deleted block", id);
        set((s) => ({
          blocks: s.blocks.filter((b) => b.id !== id),
          connections: s.connections.filter(
            (c) => c.fromId !== id && c.toId !== id,
          ),
          selectedBlockIds: s.selectedBlockIds.filter((bid) => bid !== id),
          editingBlockId: s.editingBlockId === id ? null : s.editingBlockId,
          expandedBlockIds: s.expandedBlockIds.filter((bid) => bid !== id),
        }));
      },

      duplicateBlock: (id) => {
        const now = Date.now();
        if (now - lastDuplicateTime < DUPLICATE_DEBOUNCE_MS) return null;
        lastDuplicateTime = now;
        const block = get().blocks.find((b) => b.id === id);
        if (!block) return null;
        const newBlock: Block = {
          ...block,
          id: generateId(),
          position: { x: block.position.x + 30, y: block.position.y + 30 },
          zIndex: get().blocks.length + 1,
        };
        // Generate unique title for AI blocks
        if (newBlock.type.startsWith("ai-")) {
          const baseName = block.title.replace(/\s*\d+$/, "");
          const existing = get().blocks.filter(b => b.type === block.type);
          const n = existing.length + 1;
          newBlock.title = `${baseName} ${n}`;
          // Clear alias to avoid duplicates
          newBlock.alias = undefined;
        }
        log.info("Duplicated block", id, "->", newBlock.id);
        set((s) => ({
          blocks: [...s.blocks, newBlock],
          selectedBlockIds: [newBlock.id],
        }));
        return newBlock.id;
      },

      moveBlock: (id, position) => {
        set((s) => ({
          blocks: s.blocks.map((b) =>
            b.id === id ? { ...b, position } : b,
          ),
        }));
      },

      resizeBlock: (id, width, height) => {
        log.debug("Resize block", id, { width, height });
        set((s) => ({
          blocks: s.blocks.map((b) =>
            b.id === id
              ? { ...b, width: Math.max(120, width), height: height === 0 ? 0 : Math.max(60, height) }
              : b,
          ),
        }));
      },

      addConnection: (fromId, toId) => {
        if (fromId === toId) return;
        const exists = get().connections.some(
          (c) => c.fromId === fromId && c.toId === toId,
        );
        if (exists) return;
        log.info("Added connection", fromId, "->", toId);
        set((s) => ({
          connections: [
            ...s.connections,
            { id: generateId(), fromId, toId, label: "", style: "arrow" },
          ],
        }));
      },

      updateConnection: (id, updates) => {
        set((s) => ({
          connections: s.connections.map((c) =>
            c.id === id ? { ...c, ...updates } : c,
          ),
        }));
      },

      deleteConnection: (id) => {
        set((s) => ({
          connections: s.connections.filter((c) => c.id !== id),
        }));
      },

      setCamera: (partial) =>
        set((s) => ({ camera: { ...s.camera, ...partial } })),
      setTool: (tool) => set({ activeTool: tool, connectingFromId: null, editingBlockId: null, selectedBlockIds: [] }),
      setSelectedBlock: (id) => set({ selectedBlockIds: id ? [id] : [] }),

      toggleSelectBlock: (id) => set((s) => ({
        selectedBlockIds: s.selectedBlockIds.includes(id)
          ? s.selectedBlockIds.filter((bid) => bid !== id)
          : [...s.selectedBlockIds, id],
      })),

      clearSelection: () => set({ selectedBlockIds: [] }),

      deleteSelectedBlocks: () => {
        const ids = new Set(get().selectedBlockIds);
        if (ids.size === 0) return;
        log.info("Deleted blocks", [...ids]);
        set((s) => ({
          blocks: s.blocks.filter((b) => !ids.has(b.id)),
          connections: s.connections.filter(
            (c) => !ids.has(c.fromId) && !ids.has(c.toId),
          ),
          selectedBlockIds: [],
          editingBlockId: ids.has(s.editingBlockId ?? "") ? null : s.editingBlockId,
        }));
      },

      duplicateSelectedBlocks: () => {
        const now = Date.now();
        if (now - lastDuplicateTime < DUPLICATE_DEBOUNCE_MS) return;
        lastDuplicateTime = now;
        const ids = get().selectedBlockIds;
        if (ids.length === 0) return;
        const newBlocks: Block[] = [];
        const blockCount = get().blocks.length;
        for (const id of ids) {
          const block = get().blocks.find((b) => b.id === id);
          if (!block) continue;
          const newBlock: Block = {
            ...block,
            id: generateId(),
            position: { x: block.position.x + 30, y: block.position.y + 30 },
            zIndex: blockCount + newBlocks.length + 1,
          };
          if (newBlock.type.startsWith("ai-")) {
            const baseName = block.title.replace(/\s*\d+$/, "");
            const allBlocks = [...get().blocks, ...newBlocks];
            const existing = allBlocks.filter(b => b.type === block.type);
            newBlock.title = `${baseName} ${existing.length + 1}`;
            newBlock.alias = undefined;
          }
          newBlocks.push(newBlock);
        }
        log.info("Duplicated blocks", ids.length);
        set((s) => ({
          blocks: [...s.blocks, ...newBlocks],
          selectedBlockIds: newBlocks.map((b) => b.id),
        }));
      },

      setEditingBlock: (id) => set({ editingBlockId: id }),
      setDraggingBlock: (id) => set({ draggingBlockId: id }),
      setResizingBlock: (id) => set({ resizingBlockId: id }),
      setConnectingFrom: (id) => set({ connectingFromId: id }),
      setPendingConnection: (data) => set({ pendingConnection: data }),
      updatePendingConnectionTarget: (toX, toY) => set((s) => s.pendingConnection ? { pendingConnection: { ...s.pendingConnection, toX, toY } } : {}),
      setIsPanning: (panning) => set({ isPanning: panning }),

      toggleBlockExpanded: (id) => set((s) => ({
        expandedBlockIds: s.expandedBlockIds.includes(id)
          ? s.expandedBlockIds.filter((x) => x !== id)
          : [...s.expandedBlockIds, id],
      })),

      setBlockExecution: (id, executionState, executionOutput, executionError, executionTokens) => {
        set((s) => ({
          blocks: s.blocks.map((b) => {
            if (b.id !== id) return b;
            const updates: Partial<Block> = {
              executionState,
              executionOutput: executionOutput ?? b.executionOutput,
              executionError: executionState === "error" ? (executionError ?? b.executionError) : undefined,
              executionTokens: executionTokens ?? b.executionTokens,
            };
            if (executionState === "running") {
              updates.executionStartedAt = Date.now();
              updates.executionDurationMs = undefined;
              updates.executionTokens = undefined;
            } else if (executionState === "success" || executionState === "error") {
              updates.executionDurationMs = b.executionStartedAt
                ? Date.now() - b.executionStartedAt
                : undefined;
            }
            return { ...b, ...updates };
          }),
        }));
      },

      clearBlockExecution: (id) => {
        set((s) => ({
          blocks: s.blocks.map((b) =>
            b.id === id
              ? { ...b, executionState: undefined, executionOutput: undefined, executionError: undefined, executionDurationMs: undefined, executionStartedAt: undefined }
              : b,
          ),
        }));
      },

      insertWorkflow: (name, newBlocks, newConnections) => set((state) => {
        const cam = state.camera;
        const vw = typeof window !== "undefined" ? window.innerWidth : 1000;
        const vh = typeof window !== "undefined" ? window.innerHeight : 800;
        let centerX = -cam.x + vw / 2 / cam.zoom;
        const centerY = -cam.y + vh / 2 / cam.zoom;

        // Estimate block height: expanded AI blocks are tall
        const estimateH = (b: Block) => b.height > 0 ? b.height : b.type === "ai-agent" ? 450 : 250;

        // Find bounding box of template blocks
        const minX = Math.min(...newBlocks.map(b => b.position.x));
        const minY = Math.min(...newBlocks.map(b => b.position.y));
        const maxX = Math.max(...newBlocks.map(b => b.position.x + b.width));
        const maxY = Math.max(...newBlocks.map(b => b.position.y + estimateH(b)));
        const bboxW = maxX - minX;
        const bboxH = maxY - minY;

        // Shift right until no overlap with existing blocks
        const padding = 60;
        for (let attempt = 0; attempt < 20; attempt++) {
          const areaLeft = centerX - bboxW / 2 - padding;
          const areaRight = centerX + bboxW / 2 + padding;
          const areaTop = centerY - bboxH / 2 - padding;
          const areaBottom = centerY + bboxH / 2 + padding;
          const overlap = state.blocks.some(b => {
            const bRight = b.position.x + b.width;
            const bBottom = b.position.y + estimateH(b);
            return b.position.x < areaRight && bRight > areaLeft && b.position.y < areaBottom && bBottom > areaTop;
          });
          if (!overlap) break;
          centerX += bboxW + padding * 2;
        }

        const offsetX = centerX - bboxW / 2 - minX;
        const offsetY = centerY - bboxH / 2 - minY;

        const maxZ = Math.max(0, ...state.blocks.map(b => b.zIndex));

        // Create frame
        const frameBlock: Block = {
          id: generateId(),
          type: "frame",
          position: { x: centerX - bboxW / 2 - padding, y: centerY - bboxH / 2 - padding },
          width: bboxW + padding * 2,
          height: bboxH + padding * 2,
          title: name,
          content: "",
          zIndex: 0,
        };

        // Offset blocks
        const offsetBlocks = newBlocks.map(b => ({
          ...b,
          position: { x: b.position.x + offsetX, y: b.position.y + offsetY },
          zIndex: maxZ + 1,
        }));

        // Pan camera to center on the new workflow
        const newCamX = -(centerX - vw / 2 / cam.zoom);
        const newCamY = -(centerY - vh / 2 / cam.zoom);

        return {
          blocks: [...state.blocks, frameBlock, ...offsetBlocks],
          connections: [...state.connections, ...newConnections],
          expandedBlockIds: [...state.expandedBlockIds, ...offsetBlocks.filter(b => b.type.startsWith("ai-")).map(b => b.id)],
          camera: { ...cam, x: newCamX, y: newCamY },
        };
      }),

      loadProject: (project) => {
        log.info("Loaded project", project.id);
        set({
          blocks: project.blocks,
          connections: project.connections,
          camera: project.camera,
          activeTool: "select",
          selectedBlockIds: [],
          editingBlockId: null,
          draggingBlockId: null,
          resizingBlockId: null,
          connectingFromId: null,
          pendingConnection: null,
          isPanning: false,
        });
      },

      toProjectData: () => {
        const { blocks, connections, camera } = get();
        return { blocks, connections, camera };
      },

      reset: () => set(initialState),
    }),
    {
      partialize: (state) => ({
        blocks: state.blocks,
        connections: state.connections,
      }),
      equality: (past, current) =>
        past.blocks === current.blocks &&
        past.connections === current.connections,
      limit: 50,
    },
  ),
);
