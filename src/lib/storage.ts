import type { Block, Camera, Project } from "@/types";
import { createLogger } from "./logger";

const log = createLogger("storage");

export function downloadJson(content: string, filename: string) {
  const blob = new Blob([content], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function importProjectFromJson(json: string): Project | null {
  try {
    const parsed = JSON.parse(json) as Project;
    if (!parsed.id || !parsed.name || !Array.isArray(parsed.blocks)) {
      log.warn("Invalid project JSON structure");
      return null;
    }
    return parsed;
  } catch (e) {
    log.error("Failed to parse project JSON", e);
    return null;
  }
}

export function importAllFromJson(json: string): Project[] | null {
  try {
    const parsed = JSON.parse(json);
    if (parsed.version === 1 && Array.isArray(parsed.projects)) {
      return parsed.projects as Project[];
    }
    return null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Canvas export helpers (PNG / PDF)
// ---------------------------------------------------------------------------

const BBOX_PADDING = 60;

export interface BoundingBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
}

/** Calculate the bounding box that encloses all blocks with padding. */
export function getBlocksBoundingBox(blocks: Block[]): BoundingBox {
  if (blocks.length === 0) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 };
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const block of blocks) {
    const left = block.position.x;
    const top = block.position.y;
    const right = left + block.width;
    const bottom = top + block.height;

    if (left < minX) minX = left;
    if (top < minY) minY = top;
    if (right > maxX) maxX = right;
    if (bottom > maxY) maxY = bottom;
  }

  minX -= BBOX_PADDING;
  minY -= BBOX_PADDING;
  maxX += BBOX_PADDING;
  maxY += BBOX_PADDING;

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

/** Wait for two animation frames so the browser paints the updated camera. */
function waitForRender(): Promise<void> {
  return new Promise<void>((r) =>
    requestAnimationFrame(() => requestAnimationFrame(() => r())),
  );
}

/** Temporarily set camera to fit all blocks, capture the canvas DOM, then restore. */
export async function exportCanvasAsPng(
  canvasEl: HTMLElement,
  filename: string,
  setCamera: (camera: Camera) => void,
  originalCamera: Camera,
  boundingBox: BoundingBox,
): Promise<void> {
  const { default: html2canvas } = await import("html2canvas");

  const viewportW = canvasEl.clientWidth;
  const viewportH = canvasEl.clientHeight;
  const zoom = Math.min(viewportW / boundingBox.width, viewportH / boundingBox.height, 2);

  // Centre the bounding box in the viewport
  const centreX = boundingBox.minX + boundingBox.width / 2;
  const centreY = boundingBox.minY + boundingBox.height / 2;

  setCamera({
    x: centreX - viewportW / (2 * zoom),
    y: centreY - viewportH / (2 * zoom),
    zoom,
  });

  await waitForRender();

  try {
    const canvas = await html2canvas(canvasEl, {
      scale: 2,
      useCORS: true,
      backgroundColor: null,
    });

    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = filename.endsWith(".png") ? filename : `${filename}.png`;
    a.click();
  } finally {
    setCamera(originalCamera);
  }
}

/** Same as PNG export but writes into a jsPDF document. */
export async function exportCanvasAsPdf(
  canvasEl: HTMLElement,
  filename: string,
  setCamera: (camera: Camera) => void,
  originalCamera: Camera,
  boundingBox: BoundingBox,
): Promise<void> {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import("html2canvas"),
    import("jspdf"),
  ]);

  const viewportW = canvasEl.clientWidth;
  const viewportH = canvasEl.clientHeight;
  const zoom = Math.min(viewportW / boundingBox.width, viewportH / boundingBox.height, 2);

  const centreX = boundingBox.minX + boundingBox.width / 2;
  const centreY = boundingBox.minY + boundingBox.height / 2;

  setCamera({
    x: centreX - viewportW / (2 * zoom),
    y: centreY - viewportH / (2 * zoom),
    zoom,
  });

  await waitForRender();

  try {
    const canvas = await html2canvas(canvasEl, {
      scale: 2,
      useCORS: true,
      backgroundColor: null,
    });

    // html2canvas uses scale:2, so logical size is half
    const pageW = canvas.width / 2;
    const pageH = canvas.height / 2;
    const orientation = pageW >= pageH ? "landscape" : "portrait";

    const pdf = new jsPDF({
      orientation,
      unit: "px",
      format: [pageW, pageH],
    });

    const imgData = canvas.toDataURL("image/png");
    pdf.addImage(imgData, "PNG", 0, 0, pageW, pageH);
    pdf.save(filename.endsWith(".pdf") ? filename : `${filename}.pdf`);
  } finally {
    setCamera(originalCamera);
  }
}
