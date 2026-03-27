import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { act } from "@testing-library/react";

vi.mock("@tauri-apps/plugin-sql", () => ({
  default: { load: vi.fn() },
}));

vi.mock("../../src/services/api", () => ({
  getDueReviews: vi.fn().mockResolvedValue([]),
  submitReview: vi.fn(),
  getVocabSources: vi.fn().mockResolvedValue([]),
}));

const { default: useReviewStore } = await import("../../src/stores/reviewStore");
const { default: QuickScanMode } = await import(
  "../../src/components/review/QuickScanMode"
);

const mockItems = [
  {
    vocab: {
      id: 1,
      word: "ephemeral",
      type: "word" as const,
      definition: "adj. 短暂的",
      phonetic: "/ɪˈfemərəl/",
      status: "learning" as const,
      tags: "[]",
      created_at: "2026-03-28",
      updated_at: "2026-03-28",
    },
    schedule: {
      id: 1,
      vocab_id: 1,
      next_review_at: "2026-03-28",
      last_reviewed_at: null,
      interval_level: 0,
      consecutive_correct: 0,
      review_count: 0,
    },
    sources: [],
  },
  {
    vocab: {
      id: 2,
      word: "ubiquitous",
      type: "word" as const,
      definition: "adj. 无处不在的",
      phonetic: "/juːˈbɪkwɪtəs/",
      status: "learning" as const,
      tags: "[]",
      created_at: "2026-03-28",
      updated_at: "2026-03-28",
    },
    schedule: {
      id: 2,
      vocab_id: 2,
      next_review_at: "2026-03-28",
      last_reviewed_at: null,
      interval_level: 0,
      consecutive_correct: 0,
      review_count: 0,
    },
    sources: [],
  },
];

beforeEach(() => {
  act(() => {
    useReviewStore.getState().reset();
  });
});

describe("QuickScanMode", () => {
  it("renders three toggle buttons (隐藏释义, 隐藏单词, 全部显示)", () => {
    act(() => {
      useReviewStore.setState({
        items: mockItems,
        mode: "quick_scan",
      });
    });

    render(<QuickScanMode />);

    expect(screen.getByText("隐藏释义")).toBeInTheDocument();
    expect(screen.getByText("隐藏单词")).toBeInTheDocument();
    expect(screen.getByText("全部显示")).toBeInTheDocument();
  });

  it("shows completion when done", async () => {
    act(() => {
      useReviewStore.setState({
        items: mockItems,
        mode: "quick_scan",
      });
    });

    const { rerender } = render(<QuickScanMode />);

    // Click "全部显示" to skip reveal step
    const showAllBtn = screen.getByText("全部显示");
    await act(async () => {
      showAllBtn.click();
    });
    rerender(<QuickScanMode />);

    // Mark all items as remembered via the ✓ buttons
    const checkButtons = screen.getAllByTitle("记住了");
    for (const btn of checkButtons) {
      await act(async () => {
        btn.click();
      });
    }

    expect(screen.getByText("复习完成！")).toBeInTheDocument();
  });
});
