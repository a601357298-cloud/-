import { describe, expect, test } from "vitest";
import { buildShuffledOrder } from "./shuffle";

describe("buildShuffledOrder", () => {
  test("returns the same ids with a deterministic but non-original order", () => {
    const ids = ["a", "b", "c", "d"];

    const shuffled = buildShuffledOrder(ids, "python");

    expect(shuffled).toHaveLength(4);
    expect([...shuffled].sort()).toEqual(ids);
    expect(shuffled).not.toEqual(ids);
  });
});

