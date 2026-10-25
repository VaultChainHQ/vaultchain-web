// Exact-origin CORS for the faucet. The upload site (a different origin) calls /api/faucet from the
// browser, so the faucet must answer its preflight. Only origins on the list are echoed back; there
// is never a wildcard, and no credentials are involved. The faucet's per-IP and per-address limits
// still apply because the browser, not a proxy, makes the request.
export const DEFAULT_ALLOWED_ORIGINS = ["https://vaultchain-upload.vercel.app"] as const;

/** Parse FAUCET_ALLOWED_ORIGINS (comma separated). Unset means the default list; "none" disables CORS. */
export function allowedOrigins(env: string | undefined = process.env.FAUCET_ALLOWED_ORIGINS): string[] {
  if (env === undefined || env.trim() === "") return [...DEFAULT_ALLOWED_ORIGINS];
  if (env.trim().toLowerCase() === "none") return [];
  return env
    .split(",")
    .map((s) => s.trim().replace(/\/+$/, ""))
    .filter(Boolean);
}

/** CORS response headers for a request from `origin`, or {} when that origin is not allowed. */
export function corsHeaders(origin: string | null | undefined, allowed: string[] = allowedOrigins()): Record<string, string> {
  const base: Record<string, string> = { Vary: "Origin" };
  if (!origin || !allowed.includes(origin)) return base;
  return {
    ...base,
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Expose-Headers": "Retry-After",
  };
}

export function preflightHeaders(origin: string | null | undefined, allowed: string[] = allowedOrigins()): Record<string, string> {
  const h = corsHeaders(origin, allowed);
  if (!h["Access-Control-Allow-Origin"]) return h;
  return { ...h, "Access-Control-Allow-Methods": "GET, POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type", "Access-Control-Max-Age": "86400" };
}
