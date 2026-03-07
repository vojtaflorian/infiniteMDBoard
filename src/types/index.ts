export type BlockType = "text" | "image" | "link" | "sticky" | "frame" | "ai-agent" | "ai-input" | "ai-viewer";

export type BlockShape = "rect" | "oval" | "diamond" | "parallelogram";

export type ConnectionStyle = "arrow" | "bidirectional" | "blocker" | "loop" | "debate";

export type Tool = "select" | "connect";

export type AIProvider = "openai" | "google" | "anthropic" | "custom";

export type ExecutionState = "idle" | "running" | "success" | "error";

export interface Position {
  x: number;
  y: number;
}

export interface Camera extends Position {
  zoom: number;
}

export interface AIConfig {
  provider: AIProvider;
  model: string;
  endpoint?: string;
  apiKeyId: string;
  systemPrompt: string;
  userPrompt: string;
  temperature: number;
  maxTokens: number;
  topP?: number;
  topK?: number;
  stopSequences?: string[];
  responseFormat: "text" | "json" | "image";
  jsonSchema?: object;
  imageSize?: string;
  grounding?: boolean;
  safetySettings?: Record<string, string>;
}

export interface InputConfig {
  format: "text" | "json" | "file";
  fileName?: string;
  fileType?: string;
  fileSize?: number;
}

export interface ViewerConfig {
  renderMode: "text" | "json" | "html" | "markdown" | "image";
  sourceRef?: string;
}

export interface LoopCondition {
  jsonPath: string;
  operator: "lt" | "gt" | "eq" | "neq" | "gte" | "lte";
  value: number | string | boolean;
}

export interface LoopConfig {
  enabled: boolean;
  maxIterations: number;
  condition?: LoopCondition;
}

export interface Block {
  id: string;
  type: BlockType;
  position: Position;
  width: number;
  height: number;
  title: string;
  content: string;
  zIndex: number;
  color?: string;
  embed?: boolean;
  shape?: BlockShape;
  linkUrl?: string;
  alias?: string;
  aiConfig?: AIConfig;
  inputConfig?: InputConfig;
  viewerConfig?: ViewerConfig;
  executionState?: ExecutionState;
  executionOutput?: string;
  executionError?: string;
  executionDurationMs?: number;
  executionStartedAt?: number;
}

export interface Connection {
  id: string;
  fromId: string;
  toId: string;
  label: string;
  style?: ConnectionStyle;
  loopConfig?: LoopConfig;
}

export interface Project {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  blocks: Block[];
  connections: Connection[];
  camera: Camera;
}

export interface StoredApiKey {
  id: string;
  label: string;
  provider: AIProvider;
  key: string;
}
