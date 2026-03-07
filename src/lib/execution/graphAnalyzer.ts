import type { Block, Connection } from "@/types";
import { extractRefs, findBlockByRef } from "./templateResolver";

export interface ExecutionPlan {
  order: string[];
  errors: string[];
}

function getAIBlocks(blocks: Block[]): Block[] {
  return blocks.filter((b) => b.type === "ai-agent" || b.type === "ai-input" || b.type === "ai-viewer");
}

function getNonLoopConnections(connections: Connection[]): Connection[] {
  return connections.filter((c) => !c.loopConfig?.enabled);
}

export function buildDependencyGraph(
  blocks: Block[],
  connections: Connection[],
): Map<string, Set<string>> {
  const aiBlocks = getAIBlocks(blocks);
  const deps = new Map<string, Set<string>>();

  for (const block of aiBlocks) {
    deps.set(block.id, new Set());
  }

  // Connections (non-loop) define dependencies
  for (const conn of getNonLoopConnections(connections)) {
    if (deps.has(conn.toId) && deps.has(conn.fromId)) {
      deps.get(conn.toId)!.add(conn.fromId);
    }
  }

  // Template references also define dependencies
  for (const block of aiBlocks) {
    const texts: string[] = [];
    if (block.aiConfig) {
      texts.push(block.aiConfig.userPrompt, block.aiConfig.systemPrompt);
    }
    if (block.viewerConfig?.sourceRef) {
      texts.push(block.viewerConfig.sourceRef);
    }
    for (const text of texts) {
      const refs = extractRefs(text);
      for (const ref of refs) {
        const refBlock = findBlockByRef(ref, blocks);
        if (refBlock && deps.has(refBlock.id) && refBlock.id !== block.id) {
          deps.get(block.id)!.add(refBlock.id);
        }
      }
    }
  }

  return deps;
}

export function topologicalSort(
  blocks: Block[],
  connections: Connection[],
): ExecutionPlan {
  const deps = buildDependencyGraph(blocks, connections);
  const order: string[] = [];
  const visited = new Set<string>();
  const visiting = new Set<string>();
  const errors: string[] = [];

  function visit(id: string): boolean {
    if (visited.has(id)) return true;
    if (visiting.has(id)) {
      const block = blocks.find((b) => b.id === id);
      errors.push(`Cycle detected involving block "${block?.title || id}"`);
      return false;
    }
    visiting.add(id);
    const blockDeps = deps.get(id);
    if (blockDeps) {
      for (const depId of blockDeps) {
        if (!visit(depId)) return false;
      }
    }
    visiting.delete(id);
    visited.add(id);
    order.push(id);
    return true;
  }

  for (const id of deps.keys()) {
    if (!visited.has(id)) {
      visit(id);
    }
  }

  return { order, errors };
}

export function getLoopConnections(connections: Connection[]): Connection[] {
  return connections.filter((c) => c.loopConfig?.enabled);
}

export function getDownstreamBlocks(
  blockId: string,
  connections: Connection[],
): string[] {
  return getNonLoopConnections(connections)
    .filter((c) => c.fromId === blockId)
    .map((c) => c.toId);
}
