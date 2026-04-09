import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, test, vi } from "vitest";
import { AppShell } from "./AppShell";

const logout = vi.fn();

vi.mock("../auth/AuthContext", () => ({
  useAuth: () => ({
    user: {
      id: "admin-1",
      username: "admin",
      displayName: "管理员",
      role: "admin",
      createdAt: "2026-04-08T00:00:00.000Z"
    },
    logout
  })
}));

describe("AppShell", () => {
  test("highlights the active nav button and always offers a study home entry", () => {
    render(
      <MemoryRouter initialEntries={["/admin/users"]}>
        <Routes>
          <Route element={<AppShell />}>
            <Route path="/admin/users" element={<div>admin page</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByRole("link", { name: "刷题主页" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "管理账号" })).toHaveClass("nav-button--active");
    expect(screen.getByRole("link", { name: "上传题目" })).not.toHaveClass("nav-button--active");
  });
});

