import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import { getSetting, saveSetting } from "../services/api";

type AiProvider = "claude" | "openai";

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
      // Load AI provider from settings DB
      const provider = (await getSetting("ai_provider")) as AiProvider | null;
      const aiProvider: AiProvider = provider === "openai" ? "openai" : "claude";

      // Load API key from Rust keychain
      let apiKey = "";
      try {
        apiKey = await invoke<string>("get_api_key", { provider: aiProvider });
      } catch {
        // Key not set yet, that's fine
      }

      set({ aiProvider, apiKey, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  setApiKey: async (key: string) => {
    const { aiProvider } = get();
    await invoke("save_api_key", { provider: aiProvider, key });
    set({ apiKey: key, testResult: null });
  },

  setAiProvider: async (provider: AiProvider) => {
    await saveSetting("ai_provider", provider);

    // Load API key for the new provider
    let apiKey = "";
    try {
      apiKey = await invoke<string>("get_api_key", { provider });
    } catch {
      // Key not set yet
    }

    set({ aiProvider: provider, apiKey, testResult: null });
  },

  testConnection: async () => {
    const { aiProvider } = get();
    set({ isLoading: true, testResult: null });
    try {
      await invoke("call_ai_analysis", {
        content: "Hello",
        provider: aiProvider,
      });
      set({ testResult: "success", isLoading: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      set({ testResult: message, isLoading: false });
    }
  },
}));

export default useSettingsStore;
