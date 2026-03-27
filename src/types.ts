// --- Database Models ---
export interface Text {
  id: number;
  content: string;
  translation: string;
  analysis_json: string;
  created_at: string;
}

export interface Vocabulary {
  id: number;
  word: string;
  type: "word" | "phrase";
  definition: string;
  phonetic: string;
  status: "new" | "learning" | "mastered";
  tags: string;
  created_at: string;
  updated_at: string;
}

export interface VocabSource {
  id: number;
  vocab_id: number;
  text_id: number;
  context_sentence: string;
}

export interface ReviewSchedule {
  id: number;
  vocab_id: number;
  next_review_at: string;
  last_reviewed_at: string | null;
  interval_level: number;
  consecutive_correct: number;
  review_count: number;
}

export interface ReviewLog {
  id: number;
  vocab_id: number | null;
  reviewed_at: string;
  mode: "flashcard" | "quick_scan";
  sub_mode: string;
  result: "forgot" | "fuzzy" | "remembered";
}

// --- AI Analysis ---
export interface SentenceStructure {
  subject: { text: string; role: string };
  predicate: { text: string; role: string };
  object: { text: string; role: string };
  modifiers: Array<{ text: string; role: string; modifies: string }>;
}

export interface AnalysisSentence {
  original: string;
  structure: SentenceStructure;
}

export interface Highlight {
  text: string;
  type: "word" | "phrase" | "grammar";
  definition: string;
}

export interface AnalysisResult {
  translation: string;
  sentences: AnalysisSentence[];
  highlights: Highlight[];
}

// --- Review ---
export type ReviewMode = "flashcard" | "quick_scan";
export type FlashcardSubMode = "def_to_word" | "word_to_def" | "spelling";
export type QuickScanSubMode = "hide_def" | "hide_word";
export type ReviewResult = "forgot" | "fuzzy" | "remembered";

export interface ReviewItem {
  vocab: Vocabulary;
  schedule: ReviewSchedule;
  sources: VocabSource[];
}
