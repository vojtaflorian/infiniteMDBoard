import type { Block } from "@/types";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

export function getBlockAlias(block: Block): string {
  if (block.alias) return block.alias;
  if (block.title) return slugify(block.title);
  return `block_${block.id}`;
}

export function findBlockByRef(ref: string, blocks: Block[]): Block | undefined {
  return blocks.find((b) => {
    if (b.alias === ref) return true;
    if (b.title && slugify(b.title) === ref) return true;
    if (`block_${b.id}` === ref) return true;
    return false;
  });
}

function getNestedValue(obj: unknown, path: string): unknown {
  const parts = path.split(/\.|\[(\d+)\]/).filter(Boolean);
  let current = obj;
  for (const part of parts) {
    if (current == null || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

function getBlockOutput(block: Block): string {
  if (block.type === "ai-input") return block.content;
  return block.executionOutput ?? "";
}

export interface ResolveError {
  ref: string;
  reason: "not_found" | "no_output";
}

export interface ResolveResult {
  text: string;
  errors: ResolveError[];
}

const TEMPLATE_REGEX = /\{\{([^}]+)\}\}/g;

export function extractRefs(text: string): string[] {
  const refs: string[] = [];
  let match;
  const regex = new RegExp(TEMPLATE_REGEX.source, "g");
  while ((match = regex.exec(text)) !== null) {
    const fullRef = match[1].trim();
    const blockRef = fullRef.split(".")[0].split("[")[0];
    if (!refs.includes(blockRef)) refs.push(blockRef);
  }
  return refs;
}

export function resolveTemplates(text: string, blocks: Block[]): ResolveResult {
  const errors: ResolveError[] = [];

  const resolved = text.replace(TEMPLATE_REGEX, (original, refStr: string) => {
    const ref = refStr.trim();
    const dotIndex = ref.indexOf(".");
    const bracketIndex = ref.indexOf("[");
    const firstSep = dotIndex === -1 ? bracketIndex : bracketIndex === -1 ? dotIndex : Math.min(dotIndex, bracketIndex);
    const blockRef = firstSep === -1 ? ref : ref.substring(0, firstSep);
    const path = firstSep === -1 ? "" : ref.substring(firstSep).replace(/^\./, "");

    const block = findBlockByRef(blockRef, blocks);
    if (!block) {
      if (!errors.some((e) => e.ref === blockRef && e.reason === "not_found")) {
        errors.push({ ref: blockRef, reason: "not_found" });
      }
      return original;
    }

    const output = getBlockOutput(block);
    if (!output && block.type !== "ai-input") {
      if (!errors.some((e) => e.ref === blockRef && e.reason === "no_output")) {
        errors.push({ ref: blockRef, reason: "no_output" });
      }
      return original;
    }

    if (!path) return output;

    // Try parsing as JSON for path access
    try {
      const parsed = JSON.parse(output);
      const value = getNestedValue(parsed, path);
      if (value === undefined) return original;
      return typeof value === "object" ? JSON.stringify(value) : String(value);
    } catch {
      return original;
    }
  });

  return { text: resolved, errors };
}

export function validateRefs(text: string, blocks: Block[]): ResolveError[] {
  const errors: ResolveError[] = [];
  let match;
  const regex = new RegExp(TEMPLATE_REGEX.source, "g");
  while ((match = regex.exec(text)) !== null) {
    const ref = match[1].trim();
    const blockRef = ref.split(".")[0].split("[")[0];
    const block = findBlockByRef(blockRef, blocks);
    if (!block) {
      if (!errors.some((e) => e.ref === blockRef)) {
        errors.push({ ref: blockRef, reason: "not_found" });
      }
    }
  }
  return errors;
}
