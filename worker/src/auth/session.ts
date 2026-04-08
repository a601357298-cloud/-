import type { SessionService, SessionUser } from "../types";

const textEncoder = new TextEncoder();
const SESSION_MAX_AGE = 60 * 60 * 24 * 7;

function toBase64Url(bytes: Uint8Array) {
  let binary = "";
  bytes.forEach((value) => {
    binary += String.fromCharCode(value);
  });
  const base64 = btoa(binary);
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  const binary = atob(padded);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function parseCookies(header: string | null) {
  const cookieMap = new Map<string, string>();
  if (!header) {
    return cookieMap;
  }

  header.split(";").forEach((entry) => {
    const [rawName, ...rest] = entry.trim().split("=");
    if (!rawName) {
      return;
    }

    cookieMap.set(rawName, rest.join("="));
  });

  return cookieMap;
}

async function createSignature(secret: string, value: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    textEncoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign("HMAC", key, textEncoder.encode(value));
  return toBase64Url(new Uint8Array(signature));
}

export function createSessionService(secret: string): SessionService {
  return {
    async issue(user: SessionUser) {
      const payload = {
        ...user,
        exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE
      };

      const payloadText = JSON.stringify(payload);
      const payloadBase64 = toBase64Url(textEncoder.encode(payloadText));
      const signature = await createSignature(secret, payloadBase64);
      const token = `${payloadBase64}.${signature}`;

      return `session=${token}; Path=/; HttpOnly; SameSite=None; Secure; Max-Age=${SESSION_MAX_AGE}`;
    },
    async read(request) {
      const cookies = parseCookies(request.headers.get("cookie"));
      const token = cookies.get("session");
      if (!token) {
        return null;
      }

      const [payloadBase64, signature] = token.split(".");
      if (!payloadBase64 || !signature) {
        return null;
      }

      const expected = await createSignature(secret, payloadBase64);
      if (expected !== signature) {
        return null;
      }

      const payloadText = new TextDecoder().decode(fromBase64Url(payloadBase64));
      const payload = JSON.parse(payloadText) as SessionUser & { exp: number };
      if (payload.exp < Math.floor(Date.now() / 1000)) {
        return null;
      }

      return {
        userId: payload.userId,
        role: payload.role
      };
    },
    clear() {
      return "session=; Path=/; HttpOnly; SameSite=None; Secure; Max-Age=0";
    }
  };
}
