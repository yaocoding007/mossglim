import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import { getSetting, saveSetting } from "../services/api";

type AiProvider = "claude" | "openai" | "xhs";

interface SettingsState {
  apiKey: string;
  aiProvider: AiProvider;
  isLoading: boolean;
  testResult: string | null;

  loadSettings: () => Promise<void>;
  setApiKey: (key: string) => Promise<void>;
  setAiProvider: (provider: AiProvider) => Promise<void>;
  testConnection: () => Promise<void>;
}

const useSettingsStore = create<SettingsState>((set, get) => ({
  apiKey: "",
  aiProvider: "claude",
  isLoading: false,
  testResult: null,

  loadSettings: async () => {
    set({ isLoading: true });
    try {
      const provider = (await getSetting("ai_provider")) as AiProvider | null;
      const aiProvider: AiProvider =
        provider === "openai" ? "openai" : provider === "xhs" ? "xhs" : "claude";

      // Load API key from SQLite settings table
      const apiKey = (await getSetting(`api_key_${aiProvider}`)) ?? "";

      set({ aiProvider, apiKey, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  setApiKey: async (key: string) => {
    const { aiProvider } = get();
    await saveSetting(`api_key_${aiProvider}`, key);
    set({ apiKey: key, testResult: null });
  },

  setAiProvider: async (provider: AiProvider) => {
    await saveSetting("ai_provider", provider);

    // Load API key for the new provider from settings
    const apiKey = (await getSetting(`api_key_${provider}`)) ?? "";

    set({ aiProvider: provider, apiKey, testResult: null });
  },

  testConnection: async () => {
    const { aiProvider } = get();
    const apiKey = (await getSetting(`api_key_${aiProvider}`)) ?? "";
    set({ isLoading: true, testResult: null });
    try {
      await invoke("call_ai_analysis", {
        content: "Hello",
        provider: aiProvider,
        apiKey,
      });
      set({ testResult: "success", isLoading: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      set({ testResult: message, isLoading: false });
    }
  },
}));

export default useSettingsStore;
