import type { PasswordService } from "../types";

export const PASSWORD_ITERATIONS = 100_000;
const KEY_LENGTH = 32;
const textEncoder = new TextEncoder();

function toBase64(bytes: Uint8Array) {
  let binary = "";
  bytes.forEach((value) => {
    binary += String.fromCharCode(value);
  });
  return btoa(binary);
}

function fromBase64(value: string) {
  const binary = atob(value);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function constantTimeEqual(left: Uint8Array, right: Uint8Array) {
  if (left.length !== right.length) {
    return false;
  }

  let diff = 0;
  for (let index = 0; index < left.length; index += 1) {
    diff |= left[index] ^ right[index];
  }

  return diff === 0;
}

async function deriveBits(password: string, salt: Uint8Array) {
  const material = await crypto.subtle.importKey(
    "raw",
    textEncoder.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );

  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt: salt as BufferSource,
      iterations: PASSWORD_ITERATIONS
    },
    material,
    KEY_LENGTH * 8
  );

  return new Uint8Array(bits);
}

export function createPasswordService(): PasswordService {
  return {
    async hash(password) {
      const salt = crypto.getRandomValues(new Uint8Array(16));
      const derived = await deriveBits(password, salt);
      return `pbkdf2$${PASSWORD_ITERATIONS}$${toBase64(salt)}$${toBase64(derived)}`;
    },
    async verify(password, passwordHash) {
      const [algorithm, iterationText, saltText, hashText] = passwordHash.split("$");
      if (algorithm !== "pbkdf2" || !iterationText || !saltText || !hashText) {
        return false;
      }

      const salt = fromBase64(saltText);
      const expected = fromBase64(hashText);
      const derived = await deriveBits(password, salt);
      return constantTimeEqual(expected, derived);
    }
  };
}
