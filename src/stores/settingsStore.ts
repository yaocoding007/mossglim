import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import { getSetting, saveSetting } from "../services/api";

type AiProvider = "claude" | "openai" | "xhs";
type FontSize = "small" | "medium" | "large";
type Theme = "dark" | "light" | "sage";

function applyFontSize(size: FontSize) {
  if (size === "medium") {
    document.documentElement.removeAttribute("data-font-size");
  } else {
    document.documentElement.setAttribute("data-font-size", size);
  }
}

function applyTheme(theme: Theme) {
  if (theme === "dark") {
    document.documentElement.removeAttribute("data-theme");
  } else {
    document.documentElement.setAttribute("data-theme", theme);
  }
}

interface SettingsState {
  apiKey: string;
  aiProvider: AiProvider;
  fontSize: FontSize;
  theme: Theme;
  isLoading: boolean;
  testResult: string | null;

  loadSettings: () => Promise<void>;
  setApiKey: (key: string) => Promise<void>;
  setAiProvider: (provider: AiProvider) => Promise<void>;
  setFontSize: (size: FontSize) => Promise<void>;
  setTheme: (theme: Theme) => Promise<void>;
  testConnection: () => Promise<void>;
}

const useSettingsStore = create<SettingsState>((set, get) => ({
  apiKey: "",
  aiProvider: "claude",
  fontSize: "medium",
  theme: "dark",
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

      // Load font size
      const savedFontSize = (await getSetting("font_size")) as FontSize | null;
      const fontSize: FontSize =
        savedFontSize === "small" || savedFontSize === "large" ? savedFontSize : "medium";
      applyFontSize(fontSize);

      // Load theme
      const savedTheme = (await getSetting("theme")) as Theme | null;
      const theme: Theme =
        savedTheme === "light" || savedTheme === "sage" ? savedTheme : "dark";
      applyTheme(theme);

      set({ aiProvider, apiKey, fontSize, theme, isLoading: false });
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

  setFontSize: async (size: FontSize) => {
    await saveSetting("font_size", size);
    applyFontSize(size);
    set({ fontSize: size });
  },

  setTheme: async (theme: Theme) => {
    await saveSetting("theme", theme);
    applyTheme(theme);
    set({ theme });
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
