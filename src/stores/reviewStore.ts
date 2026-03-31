import { create } from "zustand";
import type {
  ReviewItem,
  ReviewMode,
  FlashcardSubMode,
  ReviewResult,
} from "../types";
import { getDueReviews, getTodayReviewedItems, submitReview } from "../services/api";

interface ReviewState {
  items: ReviewItem[];
  currentIndex: number;
  mode: ReviewMode | null;
  flashcardSubMode: FlashcardSubMode;
  isFlipped: boolean;
  isComplete: boolean;
  userInput: string;
  isLoading: boolean;
  isPracticeMode: boolean;

  setMode: (mode: ReviewMode) => void;
  setFlashcardSubMode: (sub: FlashcardSubMode) => void;
  loadReviewItems: () => Promise<void>;
  loadTodayReviewedItems: () => Promise<void>;
  startPractice: (items: ReviewItem[], mode: ReviewMode) => void;
  flip: () => void;
  setUserInput: (input: string) => void;
  submitResult: (result: ReviewResult) => Promise<void>;
  reset: () => void;
}

const useReviewStore = create<ReviewState>((set, get) => ({
  items: [],
  currentIndex: 0,
  mode: null,
  flashcardSubMode: "def_to_word",
  isFlipped: false,
  isComplete: false,
  userInput: "",
  isLoading: false,
  isPracticeMode: false,

  setMode: (mode: ReviewMode) => {
    set({ mode });
  },

  setFlashcardSubMode: (sub: FlashcardSubMode) => {
    set({ flashcardSubMode: sub });
  },

  loadReviewItems: async () => {
    set({ isLoading: true });
    try {
      const items = await getDueReviews();
      set({ items, currentIndex: 0, isFlipped: false, userInput: "", isComplete: false, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  startPractice: (items: ReviewItem[], mode: ReviewMode) => {
    set({
      items,
      currentIndex: 0,
      mode,
      isFlipped: false,
      isComplete: false,
      userInput: "",
      isLoading: false,
      isPracticeMode: true,
    });
  },

  loadTodayReviewedItems: async () => {
    set({ isLoading: true });
    try {
      const items = await getTodayReviewedItems();
      set({ items, currentIndex: 0, isFlipped: false, userInput: "", isComplete: false, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  flip: () => {
    set({ isFlipped: true });
  },

  setUserInput: (input: string) => {
    set({ userInput: input });
  },

  submitResult: async (result: ReviewResult) => {
    const { items, currentIndex, mode, flashcardSubMode, isPracticeMode } = get();
    if (items.length === 0 || !mode) return;

    const currentItem = items[currentIndex];
    const subMode = mode === "flashcard" ? flashcardSubMode : "hide_def";

    if (!isPracticeMode) {
      await submitReview(currentItem.vocab.id, mode, subMode, result);
    }

    const nextIndex = currentIndex + 1;
    if (nextIndex >= items.length) {
      set({ isComplete: true });
    } else {
      set({ currentIndex: nextIndex, isFlipped: false, userInput: "" });
    }
  },

  reset: () => {
    set({
      items: [],
      currentIndex: 0,
      mode: null,
      flashcardSubMode: "def_to_word",
      isFlipped: false,
      isComplete: false,
      userInput: "",
      isLoading: false,
      isPracticeMode: false,
    });
  },
}));

export default useReviewStore;
