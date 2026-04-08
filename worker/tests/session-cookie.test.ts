import { describe, expect, test } from "vitest";
import { createSessionService } from "../src/auth/session";

describe("session cookie", () => {
  test("uses SameSite=None for cross-site requests from GitHub Pages to workers.dev", async () => {
    const service = createSessionService("test-secret");

    const cookie = await service.issue({
      userId: "user-1",
      role: "admin"
    });

    expect(cookie).toContain("SameSite=None");
    expect(cookie).toContain("Secure");
  });
});
