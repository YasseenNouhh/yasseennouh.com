import { describe, expect, it } from "vitest";
import { createFetchGeneration } from "../src/client/fetchGeneration";

describe("createFetchGeneration", () => {
  it("treats a token as current until a newer request begins", () => {
    const g = createFetchGeneration();
    const first = g.begin();
    expect(g.isLatest(first)).toBe(true);

    const second = g.begin();
    expect(g.isLatest(first)).toBe(false);
    expect(g.isLatest(second)).toBe(true);
  });

  it("does not share counters across instances", () => {
    const a = createFetchGeneration();
    const b = createFetchGeneration();
    const token = a.begin();
    b.begin();
    expect(a.isLatest(token)).toBe(true);
  });

  it("drops an earlier result that finishes after a later request", async () => {
    const g = createFetchGeneration();
    const applied: string[] = [];

    async function fetchTag(tag: string, delayMs: number) {
      const token = g.begin();
      await new Promise((r) => setTimeout(r, delayMs));
      if (g.isLatest(token)) applied.push(tag);
    }

    await Promise.all([fetchTag("quick", 30), fetchTag("anything", 5)]);
    expect(applied).toEqual(["anything"]);
  });
});
