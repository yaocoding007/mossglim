import Database from "@tauri-apps/plugin-sql";
import { invoke } from "@tauri-apps/api/core";
import type {
  Text,
  Vocabulary,
  VocabSource,
  ReviewSchedule,
  ReviewLog,
  AnalysisResult,
  Highlight,
  ReviewMode,
  ReviewResult,
  ReviewItem,
} from "../types";

// ---------------------------------------------------------------------------
// Database singleton
// ---------------------------------------------------------------------------

let dbInstance: Database | null = null;

async function getDb(): Promise<Database> {
  if (!dbInstance) {
    dbInstance = await Database.load("sqlite:poweren.db");
  }
  return dbInstance;
}

// ---------------------------------------------------------------------------
// Text Analysis
// ---------------------------------------------------------------------------

const MAX_SEGMENT_LEN = 3000;

/**
 * Split text into segments by paragraph boundaries, keeping each segment
 * under `maxLen` characters. If a single paragraph exceeds `maxLen` it is
 * returned as-is (we don't split mid-paragraph).
 */
function splitByParagraphs(text: string, maxLen: number): string[] {
  const paragraphs = text.split(/\n\s*\n/);
  const segments: string[] = [];
  let current = "";

  for (const para of paragraphs) {
    const trimmed = para.trim();
    if (!trimmed) continue;

    if (current.length === 0) {
      current = trimmed;
    } else if (current.length + trimmed.length + 2 <= maxLen) {
      current += "\n\n" + trimmed;
    } else {
      segments.push(current);
      current = trimmed;
    }
  }

  if (current.length > 0) {
    segments.push(current);
  }

  return segments.length > 0 ? segments : [text];
}

/** Remove duplicate highlights (same text + type). */
function deduplicateHighlights(highlights: Highlight[]): Highlight[] {
  const seen = new Set<string>();
  return highlights.filter((h) => {
    const key = `${h.text}::${h.type}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Analyse a piece of English text.
 *
 * If the content exceeds 3000 characters it is split by paragraphs, each
 * segment is sent to the AI separately, and the results are merged.
 * The full analysis is persisted in the `texts` table.
 */
async function analyzeText(content: string): Promise<{ textId: number; result: AnalysisResult }> {
  const db = await getDb();
  const segments = content.length > MAX_SEGMENT_LEN
    ? splitByParagraphs(content, MAX_SEGMENT_LEN)
    : [content];

  let mergedTranslation = "";
  let mergedSentences: AnalysisResult["sentences"] = [];
  let mergedHighlights: Highlight[] = [];

  for (const segment of segments) {
    const raw: string = await invoke("call_ai_analysis", { content: segment });
    const parsed: AnalysisResult = JSON.parse(raw);

    mergedTranslation += (mergedTranslation ? "\n\n" : "") + parsed.translation;
    mergedSentences = mergedSentences.concat(parsed.sentences);
    mergedHighlights = mergedHighlights.concat(parsed.highlights);
  }

  mergedHighlights = deduplicateHighlights(mergedHighlights);

  const result: AnalysisResult = {
    translation: mergedTranslation,
    sentences: mergedSentences,
    highlights: mergedHighlights,
  };

  const res = await db.execute(
    "INSERT INTO texts (content, translation, analysis_json) VALUES (?, ?, ?)",
    [content, result.translation, JSON.stringify(result)],
  );

  return { textId: res.lastInsertId as number, result };
}

// ---------------------------------------------------------------------------
// Texts CRUD
// ---------------------------------------------------------------------------

async function getTexts(): Promise<Text[]> {
  const db = await getDb();
  return await db.select<Text[]>("SELECT * FROM texts ORDER BY created_at DESC");
}

async function searchTexts(query: string): Promise<Text[]> {
  const db = await getDb();
  const pattern = `%${query}%`;
  return await db.select<Text[]>(
    "SELECT * FROM texts WHERE content LIKE ? OR translation LIKE ? ORDER BY created_at DESC",
    [pattern, pattern],
  );
}

async function deleteText(id: number): Promise<void> {
  const db = await getDb();
  await db.execute("DELETE FROM texts WHERE id = ?", [id]);
}

// ---------------------------------------------------------------------------
// Vocabulary CRUD
// ---------------------------------------------------------------------------

/**
 * Add a vocabulary entry from text analysis.
 * Uses INSERT OR IGNORE to handle the UNIQUE constraint on `word`, then
 * fetches the existing row so we can link sources and schedule.
 */
async function addVocab(
  word: string,
  type: "word" | "phrase",
  definition: string,
  phonetic: string,
  textId: number,
  contextSentence: string,
): Promise<Vocabulary> {
  const db = await getDb();

  // Upsert: try insert, ignore if exists
  await db.execute(
    "INSERT OR IGNORE INTO vocabulary (word, type, definition, phonetic) VALUES (?, ?, ?, ?)",
    [word, type, definition, phonetic],
  );

  // Fetch the row (whether just inserted or pre-existing)
  const rows = await db.select<Vocabulary[]>(
    "SELECT * FROM vocabulary WHERE word = ?",
    [word],
  );
  const vocab = rows[0];

  // Link source
  await db.execute(
    "INSERT INTO vocab_sources (vocab_id, text_id, context_sentence) VALUES (?, ?, ?)",
    [vocab.id, textId, contextSentence],
  );

  // Ensure a review schedule exists
  const scheduleRows = await db.select<ReviewSchedule[]>(
    "SELECT * FROM review_schedule WHERE vocab_id = ?",
    [vocab.id],
  );
  if (scheduleRows.length === 0) {
    await db.execute(
      "INSERT INTO review_schedule (vocab_id) VALUES (?)",
      [vocab.id],
    );
  }

  return vocab;
}

/** Add a vocabulary entry manually (no text source). */
async function addVocabManual(
  word: string,
  type: "word" | "phrase",
  definition: string,
): Promise<Vocabulary> {
  const db = await getDb();

  await db.execute(
    "INSERT OR IGNORE INTO vocabulary (word, type, definition) VALUES (?, ?, ?)",
    [word, type, definition],
  );

  const rows = await db.select<Vocabulary[]>(
    "SELECT * FROM vocabulary WHERE word = ?",
    [word],
  );
  const vocab = rows[0];

  // Ensure a review schedule exists
  const scheduleRows = await db.select<ReviewSchedule[]>(
    "SELECT * FROM review_schedule WHERE vocab_id = ?",
    [vocab.id],
  );
  if (scheduleRows.length === 0) {
    await db.execute(
      "INSERT INTO review_schedule (vocab_id) VALUES (?)",
      [vocab.id],
    );
  }

  return vocab;
}

interface VocabFilter {
  type?: "word" | "phrase";
  status?: "new" | "learning" | "mastered";
  search?: string;
  sort?: "recent" | "alpha" | "status";
}

async function getVocabs(filter?: VocabFilter): Promise<Vocabulary[]> {
  const db = await getDb();
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (filter?.type) {
    conditions.push("type = ?");
    params.push(filter.type);
  }
  if (filter?.status) {
    conditions.push("status = ?");
    params.push(filter.status);
  }
  if (filter?.search) {
    conditions.push("(word LIKE ? OR definition LIKE ?)");
    const pattern = `%${filter.search}%`;
    params.push(pattern, pattern);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  let orderBy: string;
  switch (filter?.sort) {
    case "alpha":
      orderBy = "ORDER BY word ASC";
      break;
    case "status":
      orderBy = "ORDER BY status ASC, updated_at DESC";
      break;
    default:
      orderBy = "ORDER BY updated_at DESC";
  }

  return await db.select<Vocabulary[]>(
    `SELECT * FROM vocabulary ${where} ${orderBy}`,
    params,
  );
}

async function getVocabSources(vocabId: number): Promise<VocabSource[]> {
  const db = await getDb();
  return await db.select<VocabSource[]>(
    "SELECT * FROM vocab_sources WHERE vocab_id = ?",
    [vocabId],
  );
}

async function deleteVocab(id: number): Promise<void> {
  const db = await getDb();
  await db.execute("DELETE FROM vocabulary WHERE id = ?", [id]);
}

async function updateVocabStatus(
  id: number,
  status: "new" | "learning" | "mastered",
): Promise<void> {
  const db = await getDb();
  await db.execute(
    "UPDATE vocabulary SET status = ?, updated_at = datetime('now') WHERE id = ?",
    [status, id],
  );
}

// ---------------------------------------------------------------------------
// Review System (Ebbinghaus algorithm)
// ---------------------------------------------------------------------------

const INTERVAL_DAYS = [1, 2, 4, 7, 15, 30];

async function getDueReviews(): Promise<ReviewItem[]> {
  const db = await getDb();
  const rows = await db.select<(Vocabulary & ReviewSchedule & { schedule_id: number })[]>(
    `SELECT v.*, rs.id AS schedule_id, rs.next_review_at, rs.last_reviewed_at,
            rs.interval_level, rs.consecutive_correct, rs.review_count
     FROM vocabulary v
     JOIN review_schedule rs ON rs.vocab_id = v.id
     WHERE rs.next_review_at <= datetime('now') AND v.status != 'mastered'
     ORDER BY rs.next_review_at ASC
     LIMIT 50`,
  );

  const items: ReviewItem[] = [];
  for (const row of rows) {
    const sources = await getVocabSources(row.id);
    items.push({
      vocab: {
        id: row.id,
        word: row.word,
        type: row.type,
        definition: row.definition,
        phonetic: row.phonetic,
        status: row.status,
        tags: row.tags,
        created_at: row.created_at,
        updated_at: row.updated_at,
      },
      schedule: {
        id: row.schedule_id,
        vocab_id: row.id,
        next_review_at: row.next_review_at,
        last_reviewed_at: row.last_reviewed_at,
        interval_level: row.interval_level,
        consecutive_correct: row.consecutive_correct,
        review_count: row.review_count,
      },
      sources,
    });
  }

  return items;
}

async function getDueReviewCount(): Promise<number> {
  const db = await getDb();
  const rows = await db.select<{ count: number }[]>(
    `SELECT COUNT(*) AS count
     FROM review_schedule rs
     JOIN vocabulary v ON v.id = rs.vocab_id
     WHERE rs.next_review_at <= datetime('now') AND v.status != 'mastered'`,
  );
  return rows[0].count;
}

async function submitReview(
  vocabId: number,
  mode: ReviewMode,
  subMode: string,
  result: ReviewResult,
): Promise<void> {
  const db = await getDb();

  // Fetch current schedule
  const scheduleRows = await db.select<ReviewSchedule[]>(
    "SELECT * FROM review_schedule WHERE vocab_id = ?",
    [vocabId],
  );
  if (scheduleRows.length === 0) return;
  const schedule = scheduleRows[0];

  let newLevel = schedule.interval_level;
  let newConsecutive = schedule.consecutive_correct;

  switch (result) {
    case "remembered":
      newConsecutive++;
      if (newLevel < INTERVAL_DAYS.length - 1) {
        newLevel++;
      }
      break;
    case "fuzzy":
      newConsecutive = 0;
      // Keep current level
      break;
    case "forgot":
      newConsecutive = 0;
      newLevel = 0;
      break;
  }

  const intervalDays = INTERVAL_DAYS[newLevel];

  // Update schedule
  await db.execute(
    `UPDATE review_schedule
     SET interval_level = ?,
         consecutive_correct = ?,
         review_count = review_count + 1,
         last_reviewed_at = datetime('now'),
         next_review_at = datetime('now', '+' || ? || ' days')
     WHERE vocab_id = ?`,
    [newLevel, newConsecutive, intervalDays, vocabId],
  );

  // Log the review
  await db.execute(
    "INSERT INTO review_logs (vocab_id, mode, sub_mode, result) VALUES (?, ?, ?, ?)",
    [vocabId, mode, subMode, result],
  );

  // Check mastery: level 5 + consecutive_correct >= 2
  if (newLevel === 5 && newConsecutive >= 2) {
    await updateVocabStatus(vocabId, "mastered");
  } else {
    // If status was 'new', move to 'learning'
    const vocabRows = await db.select<Vocabulary[]>(
      "SELECT * FROM vocabulary WHERE id = ?",
      [vocabId],
    );
    if (vocabRows.length > 0 && vocabRows[0].status === "new") {
      await updateVocabStatus(vocabId, "learning");
    }
  }
}

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

async function getSetting(key: string): Promise<string | null> {
  const db = await getDb();
  const rows = await db.select<{ value: string }[]>(
    "SELECT value FROM settings WHERE key = ?",
    [key],
  );
  return rows.length > 0 ? rows[0].value : null;
}

async function saveSetting(key: string, value: string): Promise<void> {
  const db = await getDb();
  await db.execute(
    "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = ?",
    [key, value, value],
  );
}

// ---------------------------------------------------------------------------
// Statistics
// ---------------------------------------------------------------------------

interface Stats {
  totalVocabs: number;
  newCount: number;
  learningCount: number;
  masteredCount: number;
  dueCount: number;
  totalReviews: number;
  todayReviews: number;
  totalTexts: number;
}

async function getStats(): Promise<Stats> {
  const db = await getDb();

  const totalRows = await db.select<{ count: number }[]>(
    "SELECT COUNT(*) AS count FROM vocabulary",
  );
  const newRows = await db.select<{ count: number }[]>(
    "SELECT COUNT(*) AS count FROM vocabulary WHERE status = 'new'",
  );
  const learningRows = await db.select<{ count: number }[]>(
    "SELECT COUNT(*) AS count FROM vocabulary WHERE status = 'learning'",
  );
  const masteredRows = await db.select<{ count: number }[]>(
    "SELECT COUNT(*) AS count FROM vocabulary WHERE status = 'mastered'",
  );
  const dueCount = await getDueReviewCount();
  const totalReviewRows = await db.select<{ count: number }[]>(
    "SELECT COUNT(*) AS count FROM review_logs",
  );
  const todayReviewRows = await db.select<{ count: number }[]>(
    "SELECT COUNT(*) AS count FROM review_logs WHERE date(reviewed_at) = date('now')",
  );
  const totalTextRows = await db.select<{ count: number }[]>(
    "SELECT COUNT(*) AS count FROM texts",
  );

  return {
    totalVocabs: totalRows[0].count,
    newCount: newRows[0].count,
    learningCount: learningRows[0].count,
    masteredCount: masteredRows[0].count,
    dueCount,
    totalReviews: totalReviewRows[0].count,
    todayReviews: todayReviewRows[0].count,
    totalTexts: totalTextRows[0].count,
  };
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

export {
  getDb,
  analyzeText,
  splitByParagraphs,
  deduplicateHighlights,
  getTexts,
  searchTexts,
  deleteText,
  addVocab,
  addVocabManual,
  getVocabs,
  getVocabSources,
  deleteVocab,
  updateVocabStatus,
  getDueReviews,
  getDueReviewCount,
  submitReview,
  getSetting,
  saveSetting,
  getStats,
};

export type { VocabFilter, Stats };

// Re-export ReviewLog for consumers that need it
export type { ReviewLog };
