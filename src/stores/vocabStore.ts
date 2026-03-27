import { create } from "zustand";
import Database from "@tauri-apps/plugin-sql";
import type { Vocabulary, VocabSource } from "../types";
import {
  getVocabs,
  getVocabSources,
  deleteVocab,
  type VocabFilter,
} from "../services/api";

interface VocabState {
  vocabs: Vocabulary[];
  sourceCounts: Record<number, number>;
  filter: VocabFilter;
  selectedVocab: Vocabulary | null;
  selectedSources: VocabSource[];
  isLoading: boolean;
  setFilter: (filter: VocabFilter) => void;
  loadVocabs: () => Promise<void>;
  selectVocab: (vocab: Vocabulary) => Promise<void>;
  closeDetail: () => void;
  removeVocab: (id: number) => Promise<void>;
}

const useVocabStore = create<VocabState>((set, get) => ({
  vocabs: [],
  sourceCounts: {},
  filter: {},
  selectedVocab: null,
  selectedSources: [],
  isLoading: false,

  setFilter: (filter: VocabFilter) => {
    set({ filter });
    get().loadVocabs();
  },

  loadVocabs: async () => {
    set({ isLoading: true });
    try {
      const { filter } = get();
      const vocabs = await getVocabs(filter);

      // Load source counts with a single aggregation query
      const db = await Database.load("sqlite:poweren.db");
      const rows = await db.select<{ vocab_id: number; count: number }[]>(
        "SELECT vocab_id, COUNT(*) as count FROM vocab_sources GROUP BY vocab_id",
      );
      const sourceCounts: Record<number, number> = {};
      for (const row of rows) {
        sourceCounts[row.vocab_id] = row.count;
      }

      set({ vocabs, sourceCounts, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  selectVocab: async (vocab: Vocabulary) => {
    const sources = await getVocabSources(vocab.id);
    set({ selectedVocab: vocab, selectedSources: sources });
  },

  closeDetail: () => {
    set({ selectedVocab: null, selectedSources: [] });
  },

  removeVocab: async (id: number) => {
    await deleteVocab(id);
    set({ selectedVocab: null, selectedSources: [] });
    await get().loadVocabs();
  },
}));

export default useVocabStore;
