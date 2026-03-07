import { NextRequest } from "next/server";
import { createLogger } from "@/lib/logger";

const log = createLogger("api/ai/run");

interface RunRequest {
  provider: "openai" | "google" | "anthropic" | "custom";
  endpoint?: string;
  apiKey: string;
  model: string;
  systemPrompt?: string;
  userPrompt: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  topK?: number;
  responseFormat?: "text" | "json" | "image";
  jsonSchema?: object;
  imageSize?: string;
}

function getEndpoint(provider: string, endpoint?: string): string {
  if (endpoint) return endpoint;
  switch (provider) {
    case "openai":
      return "https://api.openai.com/v1/chat/completions";
    case "google":
      return "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
    case "anthropic":
      return "https://api.anthropic.com/v1/messages";
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}

function buildOpenAIBody(req: RunRequest) {
  const messages: { role: string; content: string }[] = [];
  if (req.systemPrompt) {
    messages.push({ role: "system", content: req.systemPrompt });
  }
  messages.push({ role: "user", content: req.userPrompt });

  const body: Record<string, unknown> = {
    model: req.model,
    messages,
    stream: true,
    temperature: req.temperature ?? 1,
    max_tokens: req.maxTokens ?? 4096,
  };

  if (req.topP != null) body.top_p = req.topP;
  if (req.responseFormat === "json") {
    body.response_format = req.jsonSchema
      ? { type: "json_schema", json_schema: { name: "response", schema: req.jsonSchema, strict: true } }
      : { type: "json_object" };
  }

  return body;
}

function buildAnthropicBody(req: RunRequest) {
  const body: Record<string, unknown> = {
    model: req.model,
    max_tokens: req.maxTokens ?? 4096,
    stream: true,
    messages: [{ role: "user", content: req.userPrompt }],
    temperature: req.temperature ?? 1,
  };
  if (req.systemPrompt) body.system = req.systemPrompt;
  if (req.topP != null) body.top_p = req.topP;
  if (req.topK != null) body.top_k = req.topK;
  return body;
}

function getHeaders(provider: string, apiKey: string): Record<string, string> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (provider === "anthropic") {
    headers["x-api-key"] = apiKey;
    headers["anthropic-version"] = "2023-06-01";
  } else {
    headers["Authorization"] = `Bearer ${apiKey}`;
  }
  return headers;
}

async function* streamOpenAI(response: Response): AsyncGenerator<string> {
  const reader = response.body?.getReader();
  if (!reader) return;
  const decoder = new TextDecoder();
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
      if (data === "[DONE]") return;
      try {
        const parsed = JSON.parse(data);
        const content = parsed.choices?.[0]?.delta?.content;
        if (content) yield content;
      } catch {
        // skip malformed chunks
      }
    }
  }
}

async function* streamAnthropic(response: Response): AsyncGenerator<string> {
  const reader = response.body?.getReader();
  if (!reader) return;
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data: ")) continue;
      const data = trimmed.slice(6);
      try {
        const parsed = JSON.parse(data);
        if (parsed.type === "content_block_delta" && parsed.delta?.text) {
          yield parsed.delta.text;
        }
      } catch {
        // skip
      }
    }
  }
}

export async function POST(req: NextRequest) {
  let body: RunRequest;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!body.apiKey || !body.model || !body.userPrompt) {
    return new Response(
      JSON.stringify({ error: "apiKey, model, and userPrompt are required" }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  // Validate custom endpoints to prevent SSRF
  if (body.endpoint) {
    try {
      const url = new URL(body.endpoint);
      if (!["https:", "http:"].includes(url.protocol)) {
        return new Response(
          JSON.stringify({ error: "Endpoint must use http or https" }),
          { status: 400, headers: { "Content-Type": "application/json" } },
        );
      }
      // Block private/internal IPs
      const host = url.hostname.toLowerCase();
      if (
        host === "localhost" ||
        host === "127.0.0.1" ||
        host === "0.0.0.0" ||
        host.startsWith("10.") ||
        host.startsWith("192.168.") ||
        host.startsWith("172.") ||
        host === "[::1]" ||
        host.endsWith(".internal") ||
        host.endsWith(".local")
      ) {
        return new Response(
          JSON.stringify({ error: "Endpoint cannot target private/internal addresses" }),
          { status: 400, headers: { "Content-Type": "application/json" } },
        );
      }
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid endpoint URL" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }
  }

  try {
    // Image generation — separate path, no streaming
    if (body.responseFormat === "image") {
      const imgEndpoint = body.endpoint ?? "https://api.openai.com/v1/images/generations";
      const imgBody = {
        model: body.model,
        prompt: body.userPrompt,
        n: 1,
        size: body.imageSize ?? "1024x1024",
        response_format: "url",
      };
      const imgResponse = await fetch(imgEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${body.apiKey}` },
        body: JSON.stringify(imgBody),
      });
      if (!imgResponse.ok) {
        const errorText = await imgResponse.text();
        return new Response(
          JSON.stringify({ error: `Image generation error: ${imgResponse.status}`, details: errorText }),
          { status: 502, headers: { "Content-Type": "application/json" } },
        );
      }
      const imgData = await imgResponse.json();
      const imageUrl = imgData.data?.[0]?.url ?? imgData.data?.[0]?.b64_json;
      return new Response(JSON.stringify({ content: imageUrl }), { headers: { "Content-Type": "application/json" } });
    }

    const endpoint = getEndpoint(body.provider, body.endpoint);
    const isAnthropic = body.provider === "anthropic";
    const requestBody = isAnthropic ? buildAnthropicBody(body) : buildOpenAIBody(body);
    const headers = getHeaders(body.provider, body.apiKey);

    const response = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      log.error("Provider API error", response.status, errorText);
      return new Response(
        JSON.stringify({ error: `Provider error: ${response.status}`, details: errorText }),
        { status: 502, headers: { "Content-Type": "application/json" } },
      );
    }

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        const gen = isAnthropic ? streamAnthropic(response) : streamOpenAI(response);
        try {
          for await (const chunk of gen) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: chunk })}\n\n`));
          }
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        } catch (err) {
          log.error("Stream error", err);
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ error: "Stream interrupted" })}\n\n`),
          );
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (err) {
    log.error("AI run error", err);
    return new Response(
      JSON.stringify({ error: "AI execution failed" }),
      { status: 502, headers: { "Content-Type": "application/json" } },
    );
  }
}
