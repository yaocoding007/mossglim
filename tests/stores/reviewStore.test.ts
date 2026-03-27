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

// Must import after mocks
const { default: useReviewStore } = await import("../../src/stores/reviewStore");

beforeEach(() => {
  act(() => {
    useReviewStore.getState().reset();
  });
});

describe("reviewStore", () => {
  it("starts with no mode", () => {
    const state = useReviewStore.getState();
    expect(state.mode).toBeNull();
    expect(state.items).toEqual([]);
    expect(state.currentIndex).toBe(0);
    expect(state.isFlipped).toBe(false);
    expect(state.isComplete).toBe(false);
  });

  it("can set mode", () => {
    act(() => {
      useReviewStore.getState().setMode("flashcard");
    });
    expect(useReviewStore.getState().mode).toBe("flashcard");
  });

  it("can set flashcard sub mode", () => {
    act(() => {
      useReviewStore.getState().setFlashcardSubMode("spelling");
    });
    expect(useReviewStore.getState().flashcardSubMode).toBe("spelling");
  });

  it("can flip card", () => {
    act(() => {
      useReviewStore.getState().flip();
    });
    expect(useReviewStore.getState().isFlipped).toBe(true);
  });

  it("can set user input", () => {
    act(() => {
      useReviewStore.getState().setUserInput("hello");
    });
    expect(useReviewStore.getState().userInput).toBe("hello");
  });

  it("can load review items", async () => {
    const { getDueReviews } = await import("../../src/services/api");
    const mockItems = [
      {
        vocab: {
          id: 1, word: "test", type: "word", definition: "n. test",
          phonetic: "", status: "learning", tags: "[]",
          created_at: "", updated_at: "",
        },
        schedule: {
          id: 1, vocab_id: 1, next_review_at: "", last_reviewed_at: null,
          interval_level: 0, consecutive_correct: 0, review_count: 0,
        },
        sources: [],
      },
    ];
    vi.mocked(getDueReviews).mockResolvedValueOnce(mockItems);
    await act(async () => {
      await useReviewStore.getState().loadReviewItems();
    });
    expect(useReviewStore.getState().items).toHaveLength(1);
    expect(useReviewStore.getState().isLoading).toBe(false);
  });

  it("can submit result and advance", async () => {
    const { getDueReviews, submitReview } = await import("../../src/services/api");
    const mockItems = [
      {
        vocab: {
          id: 1, word: "a", type: "word", definition: "x",
          phonetic: "", status: "learning", tags: "[]",
          created_at: "", updated_at: "",
        },
        schedule: {
          id: 1, vocab_id: 1, next_review_at: "", last_reviewed_at: null,
          interval_level: 0, consecutive_correct: 0, review_count: 0,
        },
        sources: [],
      },
      {
        vocab: {
          id: 2, word: "b", type: "word", definition: "y",
          phonetic: "", status: "learning", tags: "[]",
          created_at: "", updated_at: "",
        },
        schedule: {
          id: 2, vocab_id: 2, next_review_at: "", last_reviewed_at: null,
          interval_level: 0, consecutive_correct: 0, review_count: 0,
        },
        sources: [],
      },
    ];
    vi.mocked(getDueReviews).mockResolvedValueOnce(mockItems);

    await act(async () => {
      await useReviewStore.getState().loadReviewItems();
    });

    act(() => {
      useReviewStore.getState().setMode("flashcard");
    });

    await act(async () => {
      await useReviewStore.getState().submitResult("remembered");
    });

    expect(submitReview).toHaveBeenCalledWith(1, "flashcard", "def_to_word", "remembered");
    expect(useReviewStore.getState().currentIndex).toBe(1);
    expect(useReviewStore.getState().isFlipped).toBe(false);
  });

  it("sets isComplete when reaching the end", async () => {
    const { getDueReviews } = await import("../../src/services/api");
    const mockItems = [
      {
        vocab: {
          id: 1, word: "a", type: "word", definition: "x",
          phonetic: "", status: "learning", tags: "[]",
          created_at: "", updated_at: "",
        },
        schedule: {
          id: 1, vocab_id: 1, next_review_at: "", last_reviewed_at: null,
          interval_level: 0, consecutive_correct: 0, review_count: 0,
        },
        sources: [],
      },
    ];
    vi.mocked(getDueReviews).mockResolvedValueOnce(mockItems);

    await act(async () => {
      await useReviewStore.getState().loadReviewItems();
    });

    act(() => {
      useReviewStore.getState().setMode("flashcard");
    });

    await act(async () => {
      await useReviewStore.getState().submitResult("remembered");
    });

    expect(useReviewStore.getState().isComplete).toBe(true);
  });

  it("reset clears all state", () => {
    act(() => {
      useReviewStore.getState().setMode("flashcard");
      useReviewStore.getState().setFlashcardSubMode("spelling");
      useReviewStore.getState().setUserInput("test");
    });

    act(() => {
      useReviewStore.getState().reset();
    });

    const state = useReviewStore.getState();
    expect(state.mode).toBeNull();
    expect(state.flashcardSubMode).toBe("def_to_word");
    expect(state.userInput).toBe("");
  });
});
