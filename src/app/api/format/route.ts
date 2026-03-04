import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { createLogger } from "@/lib/logger";

const log = createLogger("api/format");

const SYSTEM_PROMPT = `You are a markdown formatting expert. Your task is to convert the provided text into clean, well-structured markdown — nothing more, nothing less.

**Strict rules:**
- Preserve the original language exactly — do NOT translate under any circumstances
- Do NOT add, remove, or reinterpret any content — restructure only
- Apply \`#\`, \`##\`, \`###\` headings based on the logical hierarchy present in the source text
- Use \`- item\` bullet lists for unordered items and \`1. item\` numbered lists for sequential or ordered content
- Wrap all code in fenced code blocks with the appropriate language tag
- Render tabular data as markdown tables
- Apply **bold** and _italic_ only where the source text implies emphasis — do not add emphasis arbitrarily
- Strip redundant whitespace, fix broken line breaks, and eliminate formatting artifacts
- Output ONLY the formatted markdown — no preamble, no explanation, no commentary of any kind`;

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "GEMINI_API_KEY not configured" },
      { status: 401 },
    );
  }

  let body: { content?: string; translate?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { content, translate } = body;
  if (!content || typeof content !== "string" || content.trim().length === 0) {
    return NextResponse.json({ error: "Content is required" }, { status: 400 });
  }

  if (content.length > 10_000) {
    return NextResponse.json(
      { error: "Content too long (max 10,000 characters)" },
      { status: 400 },
    );
  }

  try {
    const systemPrompt = translate
      ? SYSTEM_PROMPT + "\n\nAdditionally, translate the entire text to English."
      : SYSTEM_PROMPT;

    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-lite",
      contents: content,
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.1,
      },
    });

    const formatted = response.text?.trim();
    if (!formatted) {
      return NextResponse.json(
        { error: "Empty response from AI" },
        { status: 502 },
      );
    }

    return NextResponse.json({ formatted });
  } catch (err) {
    log.error("Gemini API error", err);
    return NextResponse.json(
      { error: "AI formatting failed" },
      { status: 502 },
    );
  }
}
