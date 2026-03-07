import type { Block } from "@/types";
import { useCanvasStore } from "@/stores/canvasStore";
import { resolveTemplates } from "./templateResolver";
import { topologicalSort, getLoopConnections } from "./graphAnalyzer";
import { getApiKey } from "@/lib/apiKeyStore";
import { createLogger } from "@/lib/logger";

const log = createLogger("execution");

export async function runSingleBlock(
  block: Block,
  allBlocks: Block[],
  onStream?: (text: string) => void,
  signal?: AbortSignal,
): Promise<void> {
  const store = useCanvasStore.getState();
  const config = block.aiConfig;
  if (!config) {
    store.setBlockExecution(block.id, "error", undefined, "No AI config on block");
    return;
  }

  const apiKeyEntry = getApiKey(config.apiKeyId);
  if (!apiKeyEntry) {
    store.setBlockExecution(block.id, "error", undefined, "No API key selected");
    return;
  }

  // Resolve templates in prompts
  const userResult = resolveTemplates(config.userPrompt, allBlocks);
  const systemResult = resolveTemplates(config.systemPrompt, allBlocks);

  const allErrors = [...userResult.errors, ...systemResult.errors];
  if (allErrors.length > 0) {
    const msg = allErrors.map((e) =>
      `{{${e.ref}}}: ${e.reason === "not_found" ? "block not found" : "no output yet"}`
    ).join("\n");
    store.setBlockExecution(block.id, "error", undefined, `Template errors:\n${msg}`);
    return;
  }

  store.setBlockExecution(block.id, "running");

  try {
    const response = await fetch("/api/ai/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        provider: config.provider,
        endpoint: config.endpoint,
        apiKey: apiKeyEntry.key,
        model: config.model,
        systemPrompt: systemResult.text || undefined,
        userPrompt: userResult.text,
        temperature: config.temperature,
        maxTokens: config.maxTokens,
        topP: config.topP,
        topK: config.topK,
        responseFormat: config.responseFormat,
        jsonSchema: config.jsonSchema,
        imageSize: config.imageSize,
      }),
      signal,
    });

    // Image response — not streaming, direct JSON
    if (config.responseFormat === "image") {
      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: "Unknown error" }));
        store.setBlockExecution(block.id, "error", undefined, err.error || `HTTP ${response.status}`);
        return;
      }
      const data = await response.json();
      store.setBlockExecution(block.id, "success", data.content);
      return;
    }

    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: "Unknown error" }));
      store.setBlockExecution(block.id, "error", undefined, err.error || `HTTP ${response.status}`);
      return;
    }

    const reader = response.body?.getReader();
    if (!reader) {
      store.setBlockExecution(block.id, "error", undefined, "No response stream");
      return;
    }

    const decoder = new TextDecoder();
    let fullOutput = "";
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith("data: ")) continue;
        const data = trimmed.slice(6);
        if (data === "[DONE]") break;
        try {
          const parsed = JSON.parse(data);
          if (parsed.content) {
            fullOutput += parsed.content;
            onStream?.(fullOutput);
          }
          if (parsed.error) {
            store.setBlockExecution(block.id, "error", fullOutput || undefined, parsed.error);
            return;
          }
        } catch {
          // skip malformed
        }
      }
    }

    store.setBlockExecution(block.id, "success", fullOutput);
  } catch (err) {
    if (signal?.aborted) {
      store.setBlockExecution(block.id, "idle");
      return;
    }
    log.error("Execution error", err);
    store.setBlockExecution(block.id, "error", undefined, String(err));
  }
}

export async function runPipeline(
  startBlockId?: string,
  onBlockStream?: (blockId: string, text: string) => void,
  onPipelineElapsed?: (elapsedMs: number) => void,
  signal?: AbortSignal,
): Promise<void> {
  const store = useCanvasStore.getState();
  const { blocks, connections } = store;
  const pipelineStart = Date.now();

  const elapsedInterval = onPipelineElapsed
    ? setInterval(() => onPipelineElapsed(Date.now() - pipelineStart), 500)
    : null;

  const plan = topologicalSort(blocks, connections);
  if (plan.errors.length > 0) {
    log.error("Pipeline errors:", plan.errors);
    if (elapsedInterval) clearInterval(elapsedInterval);
    return;
  }

  let order = plan.order;

  if (startBlockId) {
    const idx = order.indexOf(startBlockId);
    if (idx >= 0) order = order.slice(idx);
  }

  const runnableOrder = order.filter((id) => {
    const block = blocks.find((b) => b.id === id);
    return block?.type === "ai-agent";
  });

  for (let i = 0; i < runnableOrder.length; i++) {
    if (signal?.aborted) break;

    const blockId = runnableOrder[i];
    const currentBlocks = useCanvasStore.getState().blocks;
    const block = currentBlocks.find((b) => b.id === blockId);
    if (!block) continue;

    await runSingleBlock(
      block,
      currentBlocks,
      onBlockStream ? (text) => onBlockStream(blockId, text) : undefined,
      signal,
    );

    const updatedBlock = useCanvasStore.getState().blocks.find((b) => b.id === blockId);
    if (updatedBlock?.executionState === "error") {
      log.error("Pipeline stopped at block", blockId);
      break;
    }

    // Handle loop connections
    const loops = getLoopConnections(connections).filter(
      (c) => c.fromId === blockId || c.toId === blockId,
    );
    for (const loop of loops) {
      if (!loop.loopConfig || signal?.aborted) continue;
      const targetId = loop.fromId === blockId ? loop.toId : loop.fromId;
      const maxIter = Math.min(loop.loopConfig.maxIterations, 10);

      for (let iter = 0; iter < maxIter - 1; iter++) {
        if (signal?.aborted) break;

        if (loop.loopConfig.condition) {
          const targetBlock = useCanvasStore.getState().blocks.find((b) => b.id === targetId);
          if (targetBlock?.executionOutput) {
            try {
              const output = JSON.parse(targetBlock.executionOutput);
              const value = getJsonPathValue(output, loop.loopConfig.condition.jsonPath);
              if (evaluateCondition(value, loop.loopConfig.condition.operator, loop.loopConfig.condition.value)) {
                break;
              }
            } catch {
              // Can't parse — continue looping
            }
          }
        }

        const freshBlocks = useCanvasStore.getState().blocks;
        const targetBlock = freshBlocks.find((b) => b.id === targetId);
        if (!targetBlock || targetBlock.type !== "ai-agent") break;

        await runSingleBlock(
          targetBlock,
          freshBlocks,
          onBlockStream ? (text) => onBlockStream(targetId, text) : undefined,
          signal,
        );
      }
    }
  }

  if (elapsedInterval) clearInterval(elapsedInterval);
  const totalMs = Date.now() - pipelineStart;
  log.info(`Pipeline completed in ${totalMs}ms`);
  onPipelineElapsed?.(totalMs);
}

function getJsonPathValue(obj: unknown, path: string): unknown {
  const parts = path.split(/\.|\[(\d+)\]/).filter(Boolean);
  let current = obj;
  for (const part of parts) {
    if (current == null || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

function evaluateCondition(
  actual: unknown,
  operator: string,
  expected: number | string | boolean,
): boolean {
  const a = typeof expected === "number" ? Number(actual) : actual;
  switch (operator) {
    case "lt": return (a as number) < (expected as number);
    case "gt": return (a as number) > (expected as number);
    case "eq": return a === expected;
    case "neq": return a !== expected;
    case "gte": return (a as number) >= (expected as number);
    case "lte": return (a as number) <= (expected as number);
    default: return false;
  }
}
