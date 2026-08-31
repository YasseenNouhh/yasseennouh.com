/**
 * Admin gate.
 *
 * Preferred: Cloudflare Access sits in front of /api/admin/* and hands us a
 * signed JWT. We verify it against the team's JWKS rather than trusting the
 * header's presence -- otherwise anyone who can reach the Worker origin
 * directly could just set the header themselves.
 *
 * Fallback (local dev, or if Access isn't configured yet): a shared key.
 */

interface Jwk {
  kid: string;
  kty: string;
  n: string;
  e: string;
  alg?: string;
}

const jwksCache = new Map<string, { keys: Jwk[]; fetchedAt: number }>();
const JWKS_TTL_MS = 60 * 60 * 1000;

function b64urlToBytes(s: string): Uint8Array {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(s.length / 4) * 4, "=");
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function getJwks(teamDomain: string): Promise<Jwk[]> {
  const cached = jwksCache.get(teamDomain);
  if (cached && Date.now() - cached.fetchedAt < JWKS_TTL_MS) return cached.keys;

  const res = await fetch(`https://${teamDomain}/cdn-cgi/access/certs`);
  if (!res.ok) throw new Error(`JWKS fetch failed: ${res.status}`);
  const body = (await res.json()) as { keys: Jwk[] };
  jwksCache.set(teamDomain, { keys: body.keys, fetchedAt: Date.now() });
  return body.keys;
}

/** Returns the authenticated email, or null if the token is missing/invalid. */
export async function verifyAccessJwt(
  token: string,
  teamDomain: string,
  aud: string,
): Promise<string | null> {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [rawHeader, rawPayload, rawSig] = parts;

  let header: { kid?: string; alg?: string };
  let payload: { aud?: string | string[]; exp?: number; iss?: string; email?: string };
  try {
    header = JSON.parse(new TextDecoder().decode(b64urlToBytes(rawHeader)));
    payload = JSON.parse(new TextDecoder().decode(b64urlToBytes(rawPayload)));
  } catch {
    return null;
  }

  if (header.alg !== "RS256" || !header.kid) return null;

  const keys = await getJwks(teamDomain);
  const jwk = keys.find((k) => k.kid === header.kid);
  if (!jwk) return null;

  const key = await crypto.subtle.importKey(
    "jwk",
    { kty: jwk.kty, n: jwk.n, e: jwk.e, alg: "RS256", ext: true },
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["verify"],
  );

  const ok = await crypto.subtle.verify(
    "RSASSA-PKCS1-v1_5",
    key,
    b64urlToBytes(rawSig),
    new TextEncoder().encode(`${rawHeader}.${rawPayload}`),
  );
  if (!ok) return null;

  const now = Math.floor(Date.now() / 1000);
  if (typeof payload.exp !== "number" || payload.exp < now) return null;
  if (payload.iss !== `https://${teamDomain}`) return null;

  const audList = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
  if (!audList.includes(aud)) return null;

  return payload.email ?? "access-user";
}

/** Constant-time-ish string compare. */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function isAdmin(req: Request, env: Env): Promise<boolean> {
  if (env.CF_ACCESS_TEAM_DOMAIN && env.CF_ACCESS_AUD) {
    const token =
      req.headers.get("cf-access-jwt-assertion") ??
      (req.headers.get("cookie") ?? "").match(/CF_Authorization=([^;]+)/)?.[1] ??
      "";
    if (token) {
      const email = await verifyAccessJwt(token, env.CF_ACCESS_TEAM_DOMAIN, env.CF_ACCESS_AUD);
      if (email) return true;
    }
  }

  const provided = req.headers.get("x-admin-key");
  const expected = env.DEV_ADMIN_KEY;
  if (provided && expected) return safeEqual(provided, expected);

  return false;
}
