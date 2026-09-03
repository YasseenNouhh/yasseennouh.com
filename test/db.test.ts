/**
 * Unit tests for D1 helpers. Pure functions / a fake DB — no wrangler needed.
 *
 * D1 allows at most 100 bound parameters per statement. Binding every recipe
 * id in one IN (...) made GET /api/recipes 500 once the book grew past that.
 */
import { describe, expect, it } from "vitest";
import {
  chunkIds,
  D1_MAX_BOUND_PARAMS,
  tagsForRecipes,
} from "../src/worker/db";

describe("chunkIds", () => {
  it("returns nothing for an empty list", () => {
    expect(chunkIds([])).toEqual([]);
  });

  it("keeps a short list as a single chunk", () => {
    expect(chunkIds([1, 2, 3])).toEqual([[1, 2, 3]]);
  });

  it("splits on D1's bound-parameter limit", () => {
    const ids = Array.from({ length: 250 }, (_, i) => i + 1);
    const chunks = chunkIds(ids);
    expect(chunks).toHaveLength(3);
    expect(chunks[0]).toHaveLength(D1_MAX_BOUND_PARAMS);
    expect(chunks[1]).toHaveLength(D1_MAX_BOUND_PARAMS);
    expect(chunks[2]).toHaveLength(50);
    expect(chunks.flat()).toEqual(ids);
  });

  it("never produces a chunk larger than the size", () => {
    const ids = Array.from({ length: 101 }, (_, i) => i);
    for (const chunk of chunkIds(ids, 100)) {
      expect(chunk.length).toBeLessThanOrEqual(100);
    }
  });
});

describe("tagsForRecipes", () => {
  type TagRow = { recipe_id: number; id: number; name: string; color: string };

  function fakeDb(rows: TagRow[]) {
    const bindCounts: number[] = [];
    const db = {
      prepare() {
        return {
          bind(...ids: number[]) {
            bindCounts.push(ids.length);
            const want = new Set(ids);
            return {
              all: async () => ({ results: rows.filter((r) => want.has(r.recipe_id)) }),
            };
          },
        };
      },
    };
    return { db: db as unknown as D1Database, bindCounts };
  }

  it("does not query when there are no recipes", async () => {
    const { db, bindCounts } = fakeDb([]);
    const map = await tagsForRecipes(db, []);
    expect(map.size).toBe(0);
    expect(bindCounts).toEqual([]);
  });

  it("never binds more than 100 ids in one statement", async () => {
    const ids = Array.from({ length: 250 }, (_, i) => i + 1);
    const { db, bindCounts } = fakeDb([]);
    await tagsForRecipes(db, ids);
    expect(bindCounts.length).toBe(3);
    expect(Math.max(...bindCounts)).toBeLessThanOrEqual(D1_MAX_BOUND_PARAMS);
    expect(bindCounts).toEqual([100, 100, 50]);
  });

  it("merges tags from every chunk", async () => {
    const ids = Array.from({ length: 101 }, (_, i) => i + 1);
    const { db, bindCounts } = fakeDb([
      { recipe_id: 1, id: 10, name: "quick", color: "#000" },
      { recipe_id: 101, id: 11, name: "fancy", color: "#fff" },
    ]);
    const map = await tagsForRecipes(db, ids);
    expect(bindCounts).toEqual([100, 1]);
    expect(map.get(1)?.map((t) => t.name)).toEqual(["quick"]);
    expect(map.get(101)?.map((t) => t.name)).toEqual(["fancy"]);
  });
});
