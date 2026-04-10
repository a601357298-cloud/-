import { describe, expect, test } from "vitest";
import { resolveApiBaseUrl } from "./api";

describe("resolveApiBaseUrl", () => {
  test("uses the configured value when provided", () => {
    expect(resolveApiBaseUrl("https://custom.example", "mainland.sk1hao.com")).toBe(
      "https://custom.example"
    );
  });

  test("falls back to the mainland API domain for the production hostnames", () => {
    expect(resolveApiBaseUrl("", "mainland.sk1hao.com")).toBe("https://api.sk1hao.com");
    expect(resolveApiBaseUrl(undefined, "mainland-answer-record-site.pages.dev")).toBe(
      "https://api.sk1hao.com"
    );
  });

  test("returns an empty string for unknown hosts without configuration", () => {
    expect(resolveApiBaseUrl("", "localhost")).toBe("");
  });
});
