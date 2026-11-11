/**
 * Unit tests for the admin shared-key gate. No wrangler needed.
 *
 * The README documents `DEV_ADMIN_KEY=loki-local-dev` for local `.dev.vars`.
 * That value must keep working on loopback (Playwright / vitest against
 * wrangler dev) and must be ignored on any public hostname, otherwise a
 * deployed Worker using the example secret is world-writable.
 */
import { describe, expect, it } from "vitest";
import {
  INSECURE_DEV_ADMIN_KEYS,
  isAdmin,
  isLoopbackHost,
  sharedKeyPermitted,
} from "../src/worker/auth";

function req(url: string, key?: string): Request {
  const headers = key ? { "x-admin-key": key } : undefined;
  return new Request(url, { headers });
}

const LOCAL = "http://127.0.0.1:8787/api/admin/check";
const PROD = "https://kitchen.yasseennouh.com/api/admin/check";
const EXAMPLE = INSECURE_DEV_ADMIN_KEYS[0];

describe("isLoopbackHost", () => {
  it("accepts local wrangler / vite-proxy targets", () => {
    expect(isLoopbackHost("http://127.0.0.1:8787/api/admin/check")).toBe(true);
    expect(isLoopbackHost("http://localhost:8787/api/admin/check")).toBe(true);
    expect(isLoopbackHost("http://[::1]/api/admin/check")).toBe(true);
  });

  it("rejects deployed hosts", () => {
    expect(isLoopbackHost(PROD)).toBe(false);
    expect(isLoopbackHost("https://lokis-kitchen.workers.dev/api/admin/check")).toBe(false);
  });
});

describe("sharedKeyPermitted", () => {
  it("allows the README example only on loopback", () => {
    expect(sharedKeyPermitted(EXAMPLE, LOCAL)).toBe(true);
    expect(sharedKeyPermitted(EXAMPLE, PROD)).toBe(false);
  });

  it("allows a non-example key on a public host", () => {
    expect(sharedKeyPermitted("a-real-kitchen-key", PROD)).toBe(true);
  });
});

describe("isAdmin shared key", () => {
  it("still unlocks local wrangler with the README example", async () => {
    const env = { DEV_ADMIN_KEY: EXAMPLE } as Env;
    expect(await isAdmin(req(LOCAL, EXAMPLE), env)).toBe(true);
  });

  it("refuses the README example on the public kitchen", async () => {
    const env = { DEV_ADMIN_KEY: EXAMPLE } as Env;
    expect(await isAdmin(req(PROD, EXAMPLE), env)).toBe(false);
  });

  it("accepts a unique key on the public kitchen", async () => {
    const env = { DEV_ADMIN_KEY: "a-real-kitchen-key" } as Env;
    expect(await isAdmin(req(PROD, "a-real-kitchen-key"), env)).toBe(true);
  });

  it("rejects a missing or wrong key", async () => {
    const env = { DEV_ADMIN_KEY: EXAMPLE } as Env;
    expect(await isAdmin(req(LOCAL), env)).toBe(false);
    expect(await isAdmin(req(LOCAL, "not-the-key"), env)).toBe(false);
  });
});
