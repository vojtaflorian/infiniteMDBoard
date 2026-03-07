import type { AIProvider } from "@/types";
import { getApiKeys } from "@/lib/apiKeyStore";

const LAST_MODEL_KEY = "ai-last-model";

const PROVIDER_MODEL_HINTS: Record<AIProvider, string[]> = {
  openai: ["gpt-4o", "gpt-4o-mini", "gpt-4.1", "gpt-4.1-mini", "gpt-4.1-nano", "o3-mini", "o4-mini"],
  google: ["gemini-2.5-pro", "gemini-2.5-flash", "gemini-2.5-flash-lite", "gemini-2.0-flash"],
  anthropic: ["claude-sonnet-4-6", "claude-haiku-4-5-20251001"],
  custom: [],
};

export function getDefaultAIConfig(provider: AIProvider): { apiKeyId: string; model: string } {
  const keys = typeof window !== "undefined" ? getApiKeys() : [];
  const providerKeys = keys.filter((k) => k.provider === provider);
  const apiKeyId = providerKeys[0]?.id ?? "";

  let model = "";
  if (typeof window !== "undefined") {
    model = localStorage.getItem(`${LAST_MODEL_KEY}-${provider}`) ?? "";
  }
  if (!model && PROVIDER_MODEL_HINTS[provider]?.length > 0) {
    model = PROVIDER_MODEL_HINTS[provider][0];
  }

  return { apiKeyId, model };
}

/** Return the provider of the first stored API key, or "openai". */
export function getDefaultProvider(): AIProvider {
  const keys = typeof window !== "undefined" ? getApiKeys() : [];
  if (keys.length > 0) return keys[0].provider;
  return "openai";
}
