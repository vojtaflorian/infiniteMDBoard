import type { Project } from "@/types";
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
