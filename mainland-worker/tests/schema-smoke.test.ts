import { expect, test } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

test("mainland worker binds a D1 database", () => {
  const config = readFileSync(join(process.cwd(), "wrangler.jsonc"), "utf8");
  expect(config).toContain("\"binding\": \"DB\"");
  expect(config).toContain("\"database_name\": \"mainland-answer-records\"");
});

test("mainland schema creates the core tables", () => {
  const sql = readFileSync(join(process.cwd(), "migrations/0001_mainland_schema.sql"), "utf8");
  expect(sql).toContain("CREATE TABLE IF NOT EXISTS users");
  expect(sql).toContain("CREATE TABLE IF NOT EXISTS categories");
  expect(sql).toContain("CREATE TABLE IF NOT EXISTS questions");
  expect(sql).toContain("CREATE TABLE IF NOT EXISTS sync_jobs");
});
