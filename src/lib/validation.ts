import { z } from "zod";

// --- Primitive schemas ---

const positionSchema = z.object({
  x: z.number().finite(),
  y: z.number().finite(),
});

const cameraSchema = z.object({
  x: z.number().finite(),
  y: z.number().finite(),
  zoom: z.number().finite().min(0.01).max(10),
});

const blockTypeSchema = z.enum(["text", "image", "link", "sticky", "frame", "ai-agent", "ai-input", "ai-viewer"]);
const blockShapeSchema = z.enum(["rect", "oval", "diamond", "parallelogram"]);
const connectionStyleSchema = z.enum(["arrow", "bidirectional", "blocker", "loop", "debate"]);

const aiProviderSchema = z.enum(["openai", "google", "anthropic", "custom"]);
const responseFormatSchema = z.enum(["text", "json", "image"]);
const executionStateSchema = z.enum(["idle", "running", "success", "error"]);

const aiConfigSchema = z.object({
  provider: aiProviderSchema,
  model: z.string().max(100),
  endpoint: z.string().max(500).optional(),
  apiKeyId: z.string().max(50),
  systemPrompt: z.string().max(100_000),
  userPrompt: z.string().max(100_000),
  temperature: z.number().min(0).max(2),
  maxTokens: z.number().int().min(1).max(1_000_000),
  topP: z.number().min(0).max(1).optional(),
  topK: z.number().int().min(1).optional(),
  stopSequences: z.array(z.string().max(100)).max(10).optional(),
  responseFormat: responseFormatSchema,
  jsonSchema: z.record(z.string(), z.unknown()).optional(),
  imageSize: z.string().max(20).optional(),
  grounding: z.boolean().optional(),
  safetySettings: z.record(z.string(), z.string()).optional(),
});

const inputConfigSchema = z.object({
  format: z.enum(["text", "json", "file"]),
  fileName: z.string().max(255).optional(),
  fileType: z.string().max(100).optional(),
  fileSize: z.number().int().min(0).optional(),
});

const viewerConfigSchema = z.object({
  renderMode: z.enum(["text", "json", "html", "markdown", "image"]),
  sourceRef: z.string().max(500).optional(),
});

const loopConditionSchema = z.object({
  jsonPath: z.string().max(500),
  operator: z.enum(["lt", "gt", "eq", "neq", "gte", "lte"]),
  value: z.union([z.number(), z.string(), z.boolean()]),
});

const loopConfigSchema = z.object({
  enabled: z.boolean(),
  maxIterations: z.number().int().min(1).max(10),
  condition: loopConditionSchema.optional(),
});

// --- Block schema ---

export const blockSchema = z.object({
  id: z.string().min(1).max(50),
  type: blockTypeSchema,
  position: positionSchema,
  width: z.number().finite().min(0),
  height: z.number().finite().min(0),
  title: z.string().max(255),
  content: z.string().max(1_000_000),
  zIndex: z.number().int().min(0),
  color: z.string().max(50).optional(),
  embed: z.boolean().optional(),
  shape: blockShapeSchema.optional(),
  linkUrl: z
    .string()
    .max(2048)
    .optional()
    .or(z.literal("")),
  alias: z.string().max(100).optional(),
  aiConfig: aiConfigSchema.optional(),
  inputConfig: inputConfigSchema.optional(),
  viewerConfig: viewerConfigSchema.optional(),
  executionState: executionStateSchema.optional(),
  executionOutput: z.string().max(5_000_000).optional(),
  executionError: z.string().max(10_000).optional(),
  executionDurationMs: z.number().int().min(0).optional(),
  executionStartedAt: z.number().int().min(0).optional(),
});

// --- Connection schema ---

export const connectionSchema = z.object({
  id: z.string().min(1).max(50),
  fromId: z.string().min(1).max(50),
  toId: z.string().min(1).max(50),
  label: z.string().max(500),
  style: connectionStyleSchema.optional(),
  loopConfig: loopConfigSchema.optional(),
});

// --- Project data (JSONB blob) ---

export const projectDataSchema = z.object({
  blocks: z.array(blockSchema).max(1000),
  connections: z.array(connectionSchema).max(2000),
  camera: cameraSchema,
});

// --- Full project for import/export ---

export const projectSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(255),
  createdAt: z.string(),
  updatedAt: z.string(),
  blocks: z.array(blockSchema).max(1000),
  connections: z.array(connectionSchema).max(2000),
  camera: cameraSchema,
});

// --- Project name ---

export const projectNameSchema = z.string().trim().min(1).max(255);

// --- Gemini API key (basic format check) ---

export const geminiKeySchema = z.string().min(10).max(256);

// --- Email ---

export const emailSchema = z.string().email().max(320);

// --- Share token (nanoid 21 chars) ---

export const shareTokenSchema = z.string().regex(/^[A-Za-z0-9_-]{21}$/);

// --- Max payload size (5 MB) ---

export const MAX_PAYLOAD_BYTES = 5 * 1024 * 1024;

export function validatePayloadSize(data: unknown): boolean {
  const json = JSON.stringify(data);
  return new Blob([json]).size <= MAX_PAYLOAD_BYTES;
}
