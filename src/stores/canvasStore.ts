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

interface CanvasState {
  blocks: Block[];
  connections: Connection[];
  camera: Camera;
  activeTool: Tool;
  selectedBlockId: string | null;
  editingBlockId: string | null;
  draggingBlockId: string | null;
  resizingBlockId: string | null;
  connectingFromId: string | null;
  isPanning: boolean;

  addBlock: (type: BlockType, position: Position, initial?: Partial<Block>) => string;
  updateBlock: (id: string, updates: Partial<Block>) => void;
  deleteBlock: (id: string) => void;
  moveBlock: (id: string, position: Position) => void;
  resizeBlock: (id: string, width: number, height: number) => void;
  addConnection: (fromId: string, toId: string) => void;
  updateConnection: (id: string, updates: Partial<Connection>) => void;
  deleteConnection: (id: string) => void;
  setCamera: (camera: Partial<Camera>) => void;
  setTool: (tool: Tool) => void;
  setSelectedBlock: (id: string | null) => void;
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
  selectedBlockId: null as string | null,
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
          text:   { title: "",  content: "", width: 250 },
          image:  { title: "New Image", content: "https://media2.giphy.com/media/v1.Y2lkPTc5MGI3NjExbnJrZHZybmUzM2s2aWozd2Mya2txY21wajNrODF6em04bGtsa2U3dSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/cXSWlQ0j4Vta8/giphy.gif", width: 250 },
          link:   { title: "New Link",  content: "", width: 280 },
          sticky: { title: "",          content: "", width: 180, color: "yellow" },
          frame:  { title: "Frame",     content: "", width: 600, height: 400 },
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
          selectedBlockId: s.selectedBlockId === id ? null : s.selectedBlockId,
          editingBlockId: s.editingBlockId === id ? null : s.editingBlockId,
        }));
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
      setTool: (tool) => set({ activeTool: tool, connectingFromId: null, editingBlockId: null }),
      setSelectedBlock: (id) => set({ selectedBlockId: id }),
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
          selectedBlockId: null,
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
