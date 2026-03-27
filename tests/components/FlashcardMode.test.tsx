import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { act } from "@testing-library/react";

vi.mock("@tauri-apps/plugin-sql", () => {
  const mockDb = {
    select: vi.fn().mockResolvedValue([]),
    execute: vi.fn().mockResolvedValue({ lastInsertId: 1 }),
  };
  return { default: { load: vi.fn().mockResolvedValue(mockDb) } };
});

vi.mock("../../src/services/api", () => ({
  getDueReviews: vi.fn().mockResolvedValue([]),
  submitReview: vi.fn().mockResolvedValue(undefined),
  getVocabs: vi.fn().mockResolvedValue([]),
  getVocabSources: vi.fn().mockResolvedValue([]),
}));

const { default: useReviewStore } = await import("../../src/stores/reviewStore");
const { default: FlashcardMode } = await import("../../src/components/review/FlashcardMode");

const mockItem = {
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
  sources: [
    { id: 1, vocab_id: 1, text_id: 1, context_sentence: "The ephemeral beauty of cherry blossoms." },
  ],
};

beforeEach(() => {
  act(() => {
    useReviewStore.getState().reset();
  });
});

describe("FlashcardMode", () => {
  it("shows progress 1 / 1", () => {
    act(() => {
      useReviewStore.setState({
        items: [mockItem],
        currentIndex: 0,
        mode: "flashcard",
        flashcardSubMode: "def_to_word",
        isFlipped: false,
        isComplete: false,
      });
    });

    render(<FlashcardMode />);
    expect(screen.getByText("1 / 1")).toBeInTheDocument();
  });

  it("shows prompt based on sub-mode def_to_word", () => {
    act(() => {
      useReviewStore.setState({
        items: [mockItem],
        currentIndex: 0,
        mode: "flashcard",
        flashcardSubMode: "def_to_word",
        isFlipped: false,
        isComplete: false,
      });
    });

    render(<FlashcardMode />);
    expect(screen.getByText("adj. 短暂的")).toBeInTheDocument();
  });

  it("shows completion message when done", () => {
    act(() => {
      useReviewStore.setState({
        items: [mockItem],
        currentIndex: 0,
        mode: "flashcard",
        flashcardSubMode: "def_to_word",
        isFlipped: false,
        isComplete: true,
      });
    });

    render(<FlashcardMode />);
    expect(screen.getByText("复习完成！")).toBeInTheDocument();
    expect(screen.getByText("返回")).toBeInTheDocument();
  });

  it("shows flip button when not flipped", () => {
    act(() => {
      useReviewStore.setState({
        items: [mockItem],
        currentIndex: 0,
        mode: "flashcard",
        flashcardSubMode: "def_to_word",
        isFlipped: false,
        isComplete: false,
      });
    });

    render(<FlashcardMode />);
    expect(screen.getByText("翻转查看答案")).toBeInTheDocument();
  });

  it("shows answer and rating buttons after flip", () => {
    act(() => {
      useReviewStore.setState({
        items: [mockItem],
        currentIndex: 0,
        mode: "flashcard",
        flashcardSubMode: "def_to_word",
        isFlipped: true,
        isComplete: false,
      });
    });

    render(<FlashcardMode />);
    expect(screen.getByText("ephemeral")).toBeInTheDocument();
    expect(screen.getByText("不认识")).toBeInTheDocument();
    expect(screen.getByText("模糊")).toBeInTheDocument();
    expect(screen.getByText("记住了")).toBeInTheDocument();
  });

  it("shows source sentence after flip", () => {
    act(() => {
      useReviewStore.setState({
        items: [mockItem],
        currentIndex: 0,
        mode: "flashcard",
        flashcardSubMode: "def_to_word",
        isFlipped: true,
        isComplete: false,
      });
    });

    render(<FlashcardMode />);
    expect(
      screen.getByText(/The ephemeral beauty of cherry blossoms/)
    ).toBeInTheDocument();
  });
});
