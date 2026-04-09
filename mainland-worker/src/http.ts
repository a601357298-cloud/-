function isJsonContentType(request: Request) {
  return request.headers.get("content-type")?.includes("application/json");
}

function resolveAllowedOrigin(request: Request, uiOrigin?: string) {
  if (!uiOrigin) {
    return null;
  }

  const origin = request.headers.get("origin");
  if (!origin) {
    return null;
  }

  const allowedOrigins = uiOrigin
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);

  return allowedOrigins.includes(origin) ? origin : null;
}

export async function readJson<T>(request: Request): Promise<T | null> {
  if (!isJsonContentType(request)) {
    return null;
  }

  try {
    return (await request.json()) as T;
  } catch {
    return null;
  }
}

export function json(
  body: unknown,
  init: ResponseInit = {},
  request?: Request,
  uiOrigin?: string
) {
  const headers = new Headers(init.headers);
  headers.set("content-type", "application/json; charset=utf-8");

  const allowedOrigin = request ? resolveAllowedOrigin(request, uiOrigin) : null;
  if (allowedOrigin) {
    headers.set("access-control-allow-origin", allowedOrigin);
    headers.set("access-control-allow-credentials", "true");
    headers.set("vary", "Origin");
  }

  return new Response(JSON.stringify(body), { ...init, headers });
}

export function empty(init: ResponseInit = {}, request?: Request, uiOrigin?: string) {
  const headers = new Headers(init.headers);

  const allowedOrigin = request ? resolveAllowedOrigin(request, uiOrigin) : null;
  if (allowedOrigin) {
    headers.set("access-control-allow-origin", allowedOrigin);
    headers.set("access-control-allow-credentials", "true");
    headers.set("vary", "Origin");
  }

  return new Response(null, { ...init, headers });
}

export function corsPreflight(request: Request, uiOrigin?: string) {
  const headers = new Headers();

  const allowedOrigin = resolveAllowedOrigin(request, uiOrigin);
  if (allowedOrigin) {
    headers.set("access-control-allow-origin", allowedOrigin);
    headers.set("access-control-allow-credentials", "true");
    headers.set("vary", "Origin");
  }

  headers.set("access-control-allow-methods", "GET,POST,PATCH,DELETE,OPTIONS");
  headers.set("access-control-allow-headers", "content-type");

  return new Response(null, { status: 204, headers });
}

export function sanitizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}
