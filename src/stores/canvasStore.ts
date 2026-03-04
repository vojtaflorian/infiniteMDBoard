import { create } from "zustand";
import { temporal } from "zundo";
import type {
  Block,
  BlockType,
  Camera,
  Connection,
  Position,
  Project,
  Tool,
} from "@/types";
import { generateId } from "@/lib/id";
import { createLogger } from "@/lib/logger";

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
  isPanning: boolean;

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
  setIsPanning: (panning: boolean) => void;
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
  isPanning: false,
};

export const useCanvasStore = create<CanvasState>()(
  temporal(
    (set, get) => ({
      ...initialState,

      addBlock: (type, position, initial) => {
        const defaults: Record<BlockType, Partial<Block>> = {
          text:   { title: "Text",   content: "", width: 250 },
          image:  { title: "Image",  content: "https://media2.giphy.com/media/v1.Y2lkPTc5MGI3NjExbnJrZHZybmUzM2s2aWozd2Mya2txY21wajNrODF6em04bGtsa2U3dSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/cXSWlQ0j4Vta8/giphy.gif", width: 250 },
          link:   { title: "Link",   content: "", width: 280 },
          sticky: { title: "Note",   content: "", width: 180, color: "yellow" },
          frame:  { title: "Frame",  content: "", width: 600, height: 400 },
        };
        const d = defaults[type];
        const block: Block = {
          id: generateId(),
          type,
          position,
          width: d.width ?? 250,
          height: 0,
          title: d.title ?? "",
          content: d.content ?? "",
          color: d.color,
          zIndex: get().blocks.length + 1,
          ...initial,
        };
        log.info("Added block", block.id);
        set((s) => ({
          blocks: [...s.blocks, block],
          editingBlockId: block.id,
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
          newBlocks.push({
            ...block,
            id: generateId(),
            position: { x: block.position.x + 30, y: block.position.y + 30 },
            zIndex: blockCount + newBlocks.length + 1,
          });
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
      setIsPanning: (panning) => set({ isPanning: panning }),

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
