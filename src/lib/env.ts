/** Validated server-side environment variables. Import this instead of using process.env directly. */

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function requireHexKey(name: string, byteLength: number): string {
  const value = requireEnv(name);
  const expectedLength = byteLength * 2;
  if (!/^[0-9a-fA-F]+$/.test(value) || value.length !== expectedLength) {
    throw new Error(
      `${name} must be a ${expectedLength}-character hex string (${byteLength} bytes)`,
    );
  }
  return value;
}

/** AES-256 encryption key — 32 bytes as 64-char hex */
export const ENCRYPTION_KEY = requireHexKey("ENCRYPTION_KEY", 32);
