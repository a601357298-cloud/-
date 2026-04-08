import { describe, expect, test } from "vitest";
import { PASSWORD_ITERATIONS } from "../src/auth/password";

describe("password configuration", () => {
  test("stays within the Cloudflare Workers PBKDF2 iteration limit", () => {
    expect(PASSWORD_ITERATIONS).toBeLessThanOrEqual(100000);
  });
});
