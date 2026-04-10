import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, test, vi } from "vitest";
import { AppShell } from "./AppShell";

const logout = vi.fn();

vi.mock("../auth/AuthContext", () => ({
  useAuth: () => ({
    user: {
      id: "user-1",
      username: "yun",
      displayName: "大脸猫的忠实粉丝",
      role: "user",
      createdAt: "2026-04-08T00:00:00.000Z"
    },
    logout
  })
}));

describe("AppShell", () => {
  test("shows a personal center entry and highlights it when active", () => {
    render(
      <MemoryRouter initialEntries={["/me"]}>
        <Routes>
          <Route element={<AppShell />}>
            <Route path="/me" element={<div>me page</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByRole("link", { name: "刷题主页" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "个人中心" })).toHaveClass("nav-button--active");
    expect(screen.getByRole("link", { name: "上传题目" })).not.toHaveClass("nav-button--active");
    expect(screen.queryByRole("link", { name: "管理账号" })).not.toBeInTheDocument();
  });
});
