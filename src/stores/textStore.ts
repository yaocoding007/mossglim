import { create } from "zustand";
import type { AnalysisResult } from "../types";
import { analyzeText } from "../services/api";

interface TextState {
  inputText: string;
  analysis: AnalysisResult | null;
  currentTextId: number | null;
  isAnalyzing: boolean;
  error: string | null;
  streamingTranslation: string | null;
  streamingProgress: number;
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
  streamingTranslation: null,
  streamingProgress: 0,

  setInputText: (text: string) => {
    set({ inputText: text });
  },

  analyze: async () => {
    const { inputText } = get();
    if (!inputText.trim()) return;

    set({ isAnalyzing: true, error: null, streamingTranslation: null, streamingProgress: 0 });
    try {
      const { textId, result } = await analyzeText(inputText, undefined, {
        onTranslation: (text) => {
          set({ streamingTranslation: text });
        },
        onProgress: (tokensReceived) => {
          set({ streamingProgress: tokensReceived });
        },
      });
      set({
        analysis: result,
        currentTextId: textId,
        isAnalyzing: false,
        streamingTranslation: null,
        streamingProgress: 0,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      set({ error: message, isAnalyzing: false, streamingTranslation: null, streamingProgress: 0 });
    }
  },

  clear: () => {
    set({
      inputText: "",
      analysis: null,
      currentTextId: null,
      isAnalyzing: false,
      error: null,
      streamingTranslation: null,
      streamingProgress: 0,
    });
  },
}));

export default useTextStore;
