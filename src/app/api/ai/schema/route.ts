import { NextRequest, NextResponse } from "next/server";
import { createLogger } from "@/lib/logger";

const log = createLogger("api/ai/schema");

function inferSchemaFromValue(value: unknown): object {
  if (value === null) return { type: "string" };
  if (typeof value === "string") return { type: "string" };
  if (typeof value === "number") return Number.isInteger(value) ? { type: "integer" } : { type: "number" };
  if (typeof value === "boolean") return { type: "boolean" };
  if (Array.isArray(value)) {
    if (value.length === 0) return { type: "array", items: { type: "string" } };
    return { type: "array", items: inferSchemaFromValue(value[0]) };
  }
  if (typeof value === "object") {
    const properties: Record<string, object> = {};
    const required: string[] = [];
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      properties[k] = inferSchemaFromValue(v);
      required.push(k);
    }
    return { type: "object", properties, required };
  }
  return { type: "string" };
}

export async function POST(req: NextRequest) {
  let body: { exampleJson: string; apiKey?: string; provider?: string; model?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.exampleJson) {
    return NextResponse.json({ error: "exampleJson is required" }, { status: 400 });
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(body.exampleJson);
  } catch {
    return NextResponse.json({ error: "exampleJson is not valid JSON" }, { status: 400 });
  }

  // If API key provided, use AI for richer schema with descriptions
  if (body.apiKey && body.model) {
    try {
      const endpoint = body.provider === "anthropic"
        ? "https://api.anthropic.com/v1/messages"
        : body.provider === "google"
          ? "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions"
          : "https://api.openai.com/v1/chat/completions";

      const isAnthropic = body.provider === "anthropic";
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (isAnthropic) {
        headers["x-api-key"] = body.apiKey;
        headers["anthropic-version"] = "2023-06-01";
      } else {
        headers["Authorization"] = `Bearer ${body.apiKey}`;
      }

      const systemPrompt = "Generate a JSON Schema from the provided example JSON. Include: type for each field, required fields, descriptions inferred from field names and values. Output ONLY the JSON schema object, no explanation.";
      const userContent = `Example JSON:\n\`\`\`json\n${body.exampleJson}\n\`\`\``;

      const requestBody = isAnthropic
        ? { model: body.model, max_tokens: 4096, system: systemPrompt, messages: [{ role: "user", content: userContent }] }
        : { model: body.model, messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userContent }], temperature: 0.1, response_format: { type: "json_object" } };

      const response = await fetch(endpoint, { method: "POST", headers, body: JSON.stringify(requestBody) });

      if (response.ok) {
        const data = await response.json();
        const text = isAnthropic
          ? data.content?.[0]?.text
          : data.choices?.[0]?.message?.content;
        if (text) {
          const schema = JSON.parse(text);
          return NextResponse.json({ schema, source: "ai" });
        }
      }
    } catch (err) {
      log.error("AI schema generation failed, falling back to inference", err);
    }
  }

  // Fallback: infer from structure
  const schema = inferSchemaFromValue(parsed);
  return NextResponse.json({ schema, source: "inferred" });
}
