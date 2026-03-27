import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, vi } from "vitest";
import Sidebar from "../../src/components/Sidebar";

vi.mock("../../src/services/api", () => ({
  getDueReviewCount: vi.fn().mockResolvedValue(12),
}));

describe("Sidebar", () => {
  it("renders all navigation items", () => {
    render(
      <MemoryRouter>
        <Sidebar />
      </MemoryRouter>
    );
    expect(screen.getByText("文本输入")).toBeInTheDocument();
    expect(screen.getByText("我的词库")).toBeInTheDocument();
    expect(screen.getByText("今日复习")).toBeInTheDocument();
    expect(screen.getByText("学习统计")).toBeInTheDocument();
    expect(screen.getByText("设置")).toBeInTheDocument();
  });

  it("displays the app name", () => {
    render(
      <MemoryRouter>
        <Sidebar />
      </MemoryRouter>
    );
    expect(screen.getByText("PowerEN")).toBeInTheDocument();
  });
});
