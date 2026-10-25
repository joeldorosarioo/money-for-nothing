function decodeBase64 (value: string): Uint8Array<ArrayBuffer> {
  return Uint8Array.from(atob(value), (character) => character.charCodeAt(0))
}

function encodeBase64 (value: Uint8Array): string {
  return btoa(Array.from(value, (byte) => String.fromCharCode(byte)).join(""))
}

export async function hashPassword (password: string, salt: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"])

  const bits = await crypto.subtle.deriveBits({
    name: "PBKDF2",
    salt: decodeBase64(salt),
    iterations: 120_000,
    hash: "SHA-256",
  }, key, 256)

  return encodeBase64(new Uint8Array(bits))
}

export function createPasswordSalt (): string {
  return encodeBase64(crypto.getRandomValues(new Uint8Array(16)))
}
