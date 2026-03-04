import type { Block, Position } from "@/types";

const DEFAULT_AUTO_HEIGHT = 80;
const EDGE_GAP = 6;

/** Read actual rendered height from DOM for auto-height blocks (height === 0). */
export function getRenderedBlockHeight(block: Block): number {
  if (block.height > 0) return block.height;
  if (typeof document === "undefined") return DEFAULT_AUTO_HEIGHT;
  const el = document.querySelector(`[data-block-id="${block.id}"]`) as HTMLElement | null;
  return el ? el.offsetHeight : DEFAULT_AUTO_HEIGHT;
}

function getEffectiveHeight(block: Block): number {
  return getRenderedBlockHeight(block);
}

export function getBlockCenter(block: Block): Position {
  return {
    x: block.position.x + block.width / 2,
    y: block.position.y + getEffectiveHeight(block) / 2,
  };
}

/** Find where a line from `inside` toward `target` exits the block's bounding rect, plus a gap. */
function getEdgePoint(block: Block, target: Position): Position {
  const cx = block.position.x + block.width / 2;
  const cy = block.position.y + getEffectiveHeight(block) / 2;
  const hw = block.width / 2;
  const hh = getEffectiveHeight(block) / 2;

  const dx = target.x - cx;
  const dy = target.y - cy;

  if (dx === 0 && dy === 0) return { x: cx, y: cy };

  // Scale factor to reach the rectangle edge
  const sx = dx !== 0 ? hw / Math.abs(dx) : Infinity;
  const sy = dy !== 0 ? hh / Math.abs(dy) : Infinity;
  const s = Math.min(sx, sy);

  // Normalize direction for the gap offset
  const len = Math.sqrt(dx * dx + dy * dy);
  const nx = dx / len;
  const ny = dy / len;

  return {
    x: cx + dx * s + nx * EDGE_GAP,
    y: cy + dy * s + ny * EDGE_GAP,
  };
}

export function screenToWorld(
  screenX: number,
  screenY: number,
  camera: { x: number; y: number; zoom: number },
  canvasRect: DOMRect,
): Position {
  return {
    x: (screenX - canvasRect.left) / camera.zoom - camera.x,
    y: (screenY - canvasRect.top) / camera.zoom - camera.y,
  };
}

export function getArrowPath(from: Block, to: Block): string {
  const fromCenter = getBlockCenter(from);
  const toCenter = getBlockCenter(to);
  const start = getEdgePoint(from, toCenter);
  const end = getEdgePoint(to, fromCenter);
  return `M ${start.x} ${start.y} L ${end.x} ${end.y}`;
}

/** Check if a world-coordinate point is inside a block's bounding rect. */
export function isPointInBlock(point: Position, block: Block): boolean {
  const h = getEffectiveHeight(block);
  return (
    point.x >= block.position.x &&
    point.x <= block.position.x + block.width &&
    point.y >= block.position.y &&
    point.y <= block.position.y + h
  );
}

export function getMidpoint(from: Block, to: Block): Position {
  const fromCenter = getBlockCenter(from);
  const toCenter = getBlockCenter(to);
  const start = getEdgePoint(from, toCenter);
  const end = getEdgePoint(to, fromCenter);
  return {
    x: (start.x + end.x) / 2,
    y: (start.y + end.y) / 2,
  };
}

export function getBlocksInFrame(frame: Block, blocks: Block[]): Block[] {
  const fx = frame.position.x;
  const fy = frame.position.y;
  const fw = frame.width;
  const fh = frame.height > 0 ? frame.height : 400;
  return blocks.filter((b) => {
    if (b.id === frame.id || b.type === "frame") return false;
    const cx = b.position.x + b.width / 2;
    const cy = b.position.y + getRenderedBlockHeight(b) / 2;
    return cx >= fx && cx <= fx + fw && cy >= fy && cy <= fy + fh;
  });
}
