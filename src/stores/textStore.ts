import { create } from "zustand";
import type { AnalysisResult } from "../types";
import { analyzeText } from "../services/api";

interface TextState {
  inputText: string;
  analysis: AnalysisResult | null;
  currentTextId: number | null;
  isAnalyzing: boolean;
  error: string | null;
  setInputText: (text: string) => void;
  analyze: () => Promise<void>;
  clear: () => void;
}

const useTextStore = create<TextState>((set, get) => ({
  inputText: "",
  analysis: null,
  currentTextId: null,
  isAnalyzing: false,
  error: null,

  setInputText: (text: string) => {
    set({ inputText: text });
  },

  analyze: async () => {
    const { inputText } = get();
    if (!inputText.trim()) return;

    set({ isAnalyzing: true, error: null });
    try {
      const { textId, result } = await analyzeText(inputText);
      set({ analysis: result, currentTextId: textId, isAnalyzing: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      set({ error: message, isAnalyzing: false });
    }
  },

  clear: () => {
    set({
      inputText: "",
      analysis: null,
      currentTextId: null,
      isAnalyzing: false,
      error: null,
    });
  },
}));

export default useTextStore;
