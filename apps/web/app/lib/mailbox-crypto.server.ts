import type { WorkerEnvConfig } from "@iwfw/config";

const ENC_PREFIX = "enc:v1:";

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

async function deriveAesKey(config: WorkerEnvConfig): Promise<CryptoKey> {
  const material = config.MAILBOX_ENCRYPTION_KEY || config.BETTER_AUTH_SECRET;
  const hash = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(`iwfw-mailbox:${material}`),
  );
  return crypto.subtle.importKey("raw", hash, { name: "AES-GCM" }, false, [
    "encrypt",
    "decrypt",
  ]);
}

/** Encrypt a mailbox password for at-rest storage. Empty → null. */
export async function encryptMailboxPassword(
  config: WorkerEnvConfig,
  plaintext: string | null | undefined,
): Promise<string | null> {
  if (!plaintext) return null;
  const key = await deriveAesKey(config);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    new TextEncoder().encode(plaintext),
  );
  const packed = new Uint8Array(iv.length + cipher.byteLength);
  packed.set(iv, 0);
  packed.set(new Uint8Array(cipher), iv.length);
  return `${ENC_PREFIX}${bytesToBase64(packed)}`;
}

/** Decrypt a stored mailbox password. Plaintext legacy values pass through. */
export async function decryptMailboxPassword(
  config: WorkerEnvConfig,
  stored: string | null | undefined,
): Promise<string | null> {
  if (!stored) return null;
  if (!stored.startsWith(ENC_PREFIX)) return stored;
  try {
    const raw = base64ToBytes(stored.slice(ENC_PREFIX.length));
    const iv = raw.slice(0, 12);
    const data = raw.slice(12);
    const key = await deriveAesKey(config);
    const plain = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      key,
      data,
    );
    return new TextDecoder().decode(plain);
  } catch {
    return null;
  }
}

export function isEncryptedMailboxPassword(stored: string | null | undefined) {
  return Boolean(stored?.startsWith(ENC_PREFIX));
}

/** Never log raw mailbox passwords. */
export function redactMailboxSecret(value: unknown): string {
  if (value == null || value === "") return "";
  return "[redacted-mailbox-secret]";
}
