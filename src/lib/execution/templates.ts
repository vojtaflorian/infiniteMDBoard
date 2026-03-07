import type { Block, Connection } from "@/types";
import { generateId } from "@/lib/id";

export interface WorkflowTemplate {
  name: string;
  description: string;
  icon: string;
  create: () => { blocks: Block[]; connections: Connection[] };
}

function makeBlock(type: Block["type"], x: number, y: number, overrides: Partial<Block>): Block {
  return {
    id: generateId(),
    type,
    position: { x, y },
    width: type === "ai-agent" ? 350 : type === "ai-viewer" ? 300 : 280,
    height: 0,
    title: "",
    content: "",
    zIndex: 1,
    ...overrides,
  };
}

function makeConnection(fromId: string, toId: string, style?: Connection["style"]): Connection {
  return { id: generateId(), fromId, toId, label: "", style };
}

export const WORKFLOW_TEMPLATES: WorkflowTemplate[] = [
  {
    name: "Summarizer",
    description: "Input text \u2192 AI summarizes \u2192 View result",
    icon: "\ud83d\udcdd",
    create: () => {
      const input = makeBlock("ai-input", 100, 200, { title: "Input Text", inputConfig: { format: "text" } });
      const agent = makeBlock("ai-agent", 500, 200, {
        title: "Summarizer",
        aiConfig: {
          provider: "openai", model: "", apiKeyId: "", temperature: 0.7, maxTokens: 2048,
          systemPrompt: "You are a concise summarizer. Provide clear, well-structured summaries.",
          userPrompt: `Summarize the following text in 3-5 bullet points:\n\n{{${input.title!.toLowerCase().replace(/\s+/g, "_")}}}`,
          responseFormat: "text",
        },
      });
      const viewer = makeBlock("ai-viewer", 950, 200, {
        title: "Summary",
        viewerConfig: { renderMode: "markdown", sourceRef: `{{${agent.title!.toLowerCase().replace(/\s+/g, "_")}}}` },
      });
      return {
        blocks: [input, agent, viewer],
        connections: [makeConnection(input.id, agent.id), makeConnection(agent.id, viewer.id)],
      };
    },
  },
  {
    name: "Translator",
    description: "Input text \u2192 Translate to target language \u2192 View",
    icon: "\ud83c\udf10",
    create: () => {
      const input = makeBlock("ai-input", 100, 200, { title: "Source Text", inputConfig: { format: "text" } });
      const agent = makeBlock("ai-agent", 500, 200, {
        title: "Translator",
        aiConfig: {
          provider: "openai", model: "", apiKeyId: "", temperature: 0.3, maxTokens: 4096,
          systemPrompt: "You are a professional translator. Translate accurately, preserving tone and meaning.",
          userPrompt: `Translate the following text to English. If the text is already in English, translate it to Czech.\n\n{{${input.title!.toLowerCase().replace(/\s+/g, "_")}}}`,
          responseFormat: "text",
        },
      });
      const viewer = makeBlock("ai-viewer", 950, 200, {
        title: "Translation",
        viewerConfig: { renderMode: "text", sourceRef: `{{${agent.title!.toLowerCase().replace(/\s+/g, "_")}}}` },
      });
      return {
        blocks: [input, agent, viewer],
        connections: [makeConnection(input.id, agent.id), makeConnection(agent.id, viewer.id)],
      };
    },
  },
  {
    name: "Critic & Refine",
    description: "Input \u2192 Write draft \u2192 Critic reviews \u2192 View",
    icon: "\ud83d\udd04",
    create: () => {
      const input = makeBlock("ai-input", 100, 200, { title: "Topic", inputConfig: { format: "text" } });
      const writer = makeBlock("ai-agent", 500, 100, {
        title: "Writer",
        aiConfig: {
          provider: "openai", model: "", apiKeyId: "", temperature: 0.8, maxTokens: 4096,
          systemPrompt: "You are a skilled writer. Create well-structured, engaging content.",
          userPrompt: `Write a detailed article about the following topic:\n\n{{${input.title!.toLowerCase().replace(/\s+/g, "_")}}}`,
          responseFormat: "text",
        },
      });
      const critic = makeBlock("ai-agent", 500, 350, {
        title: "Critic",
        aiConfig: {
          provider: "openai", model: "", apiKeyId: "", temperature: 0.5, maxTokens: 4096,
          systemPrompt: "You are a constructive critic. Review the text and suggest improvements. Then provide an improved version.",
          userPrompt: `Review and improve this text:\n\n{{${writer.title!.toLowerCase().replace(/\s+/g, "_")}}}`,
          responseFormat: "text",
        },
      });
      const viewer = makeBlock("ai-viewer", 950, 200, {
        title: "Final",
        viewerConfig: { renderMode: "markdown", sourceRef: `{{${critic.title!.toLowerCase().replace(/\s+/g, "_")}}}` },
      });
      return {
        blocks: [input, writer, critic, viewer],
        connections: [
          makeConnection(input.id, writer.id),
          makeConnection(writer.id, critic.id),
          makeConnection(critic.id, viewer.id),
        ],
      };
    },
  },
  {
    name: "Chain",
    description: "Input \u2192 Agent A processes \u2192 Agent B refines \u2192 View",
    icon: "\u26d3\ufe0f",
    create: () => {
      const input = makeBlock("ai-input", 100, 200, { title: "Data", inputConfig: { format: "text" } });
      const agentA = makeBlock("ai-agent", 450, 200, {
        title: "Analyzer",
        aiConfig: {
          provider: "openai", model: "", apiKeyId: "", temperature: 0.7, maxTokens: 4096,
          systemPrompt: "You are a data analyst. Extract key insights and patterns.",
          userPrompt: `Analyze the following data and list key findings:\n\n{{${input.title!.toLowerCase().replace(/\s+/g, "_")}}}`,
          responseFormat: "text",
        },
      });
      const agentB = makeBlock("ai-agent", 850, 200, {
        title: "Reporter",
        aiConfig: {
          provider: "openai", model: "", apiKeyId: "", temperature: 0.7, maxTokens: 4096,
          systemPrompt: "You are a report writer. Create clear, actionable reports from analysis.",
          userPrompt: `Create a structured report from these findings:\n\n{{${agentA.title!.toLowerCase().replace(/\s+/g, "_")}}}`,
          responseFormat: "text",
        },
      });
      const viewer = makeBlock("ai-viewer", 1250, 200, {
        title: "Report",
        viewerConfig: { renderMode: "markdown", sourceRef: `{{${agentB.title!.toLowerCase().replace(/\s+/g, "_")}}}` },
      });
      return {
        blocks: [input, agentA, agentB, viewer],
        connections: [
          makeConnection(input.id, agentA.id),
          makeConnection(agentA.id, agentB.id),
          makeConnection(agentB.id, viewer.id),
        ],
      };
    },
  },
];
