import { generateId } from "@/lib/id";
import type { AIProvider, StoredApiKey } from "@/types";

const STORAGE_KEY = "ai-api-keys";

function loadKeys(): StoredApiKey[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveKeys(keys: StoredApiKey[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(keys));
}

export function getApiKeys(): StoredApiKey[] {
  return loadKeys();
}

export function getApiKey(id: string): StoredApiKey | undefined {
  return loadKeys().find((k) => k.id === id);
}

export function getApiKeysByProvider(provider: AIProvider): StoredApiKey[] {
  return loadKeys().filter((k) => k.provider === provider);
}

export function addApiKey(label: string, provider: AIProvider, key: string): StoredApiKey {
  const keys = loadKeys();
  const newKey: StoredApiKey = { id: generateId(), label, provider, key };
  keys.push(newKey);
  saveKeys(keys);
  return newKey;
}

export function updateApiKey(id: string, updates: Partial<Omit<StoredApiKey, "id">>): void {
  const keys = loadKeys().map((k) => (k.id === id ? { ...k, ...updates } : k));
  saveKeys(keys);
}

export function deleteApiKey(id: string): void {
  saveKeys(loadKeys().filter((k) => k.id !== id));
}
