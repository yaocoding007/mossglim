# PowerEN Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Tauri 2.0 desktop English learning app where users paste English text, get AI-powered translation and sentence analysis, collect vocabulary, and review via Ebbinghaus spaced repetition.

**Architecture:** Tauri 2.0 Rust backend handles AI API calls and system keychain operations (API Key storage). React TypeScript frontend with Zustand state management handles all UI rendering and SQLite database operations via `@tauri-apps/plugin-sql`. The app follows a sidebar + content area layout with five modules: Text Analysis, Vocabulary, Review, Statistics, and Settings.

**Architecture Principle:** Rust only handles: (1) AI API calls, (2) Keychain read/write for API Key. All database CRUD is done on the frontend via the SQL plugin. This avoids mixing `sqlx` with `tauri-plugin-sql`.

**Tech Stack:** Tauri 2.0, Rust, React 18, TypeScript, Tailwind CSS, Zustand, SQLite (tauri-plugin-sql), Vitest + React Testing Library

**Spec:** `docs/superpowers/specs/2026-03-28-poweren-design.md`

---

## File Structure

```
poweren/
├── src-tauri/
│   ├── Cargo.toml
│   ├── tauri.conf.json
│   └── src/
│       ├── lib.rs                    # Tauri app setup, register commands
│       ├── main.rs                   # Entry point
│       ├── db.rs                     # Database initialization and schema migration
│       ├── commands.rs               # Tauri commands: call_ai_analysis, save_api_key, get_api_key
│       └── ai.rs                     # AI API client: call Claude/OpenAI, parse response + retry
├── src/
│   ├── main.tsx                      # React entry point
│   ├── App.tsx                       # Router + Layout wrapper
│   ├── types.ts                      # Shared TypeScript types
│   ├── services/
│   │   └── api.ts                    # Tauri invoke wrappers (typed)
│   ├── stores/
│   │   ├── textStore.ts              # Text analysis state
│   │   ├── vocabStore.ts             # Vocabulary state
│   │   ├── reviewStore.ts            # Review session state
│   │   └── settingsStore.ts          # Settings state
│   ├── components/
│   │   ├── Layout.tsx                # Sidebar + content area shell
│   │   ├── Sidebar.tsx               # Navigation sidebar
│   │   ├── text/
│   │   │   ├── TextInputPage.tsx     # Left-right analysis page container
│   │   │   ├── TextEditor.tsx        # Left panel: text input + highlighted text
│   │   │   ├── AnalysisPanel.tsx     # Right panel: translation + structure
│   │   │   └── TextHistory.tsx       # History list overlay
│   │   ├── vocab/
│   │   │   ├── VocabPage.tsx         # Vocabulary grid page
│   │   │   ├── VocabCard.tsx         # Single vocabulary card
│   │   │   └── VocabDetail.tsx       # Expanded detail modal (sources, edit)
│   │   ├── review/
│   │   │   ├── ReviewEntryPage.tsx   # Mode selection + start
│   │   │   ├── FlashcardMode.tsx     # Flashcard review
│   │   │   └── QuickScanMode.tsx     # Quick scan table review
│   │   ├── stats/
│   │   │   └── StatsPage.tsx         # Learning statistics charts
│   │   └── settings/
│   │       └── SettingsPage.tsx       # API config + preferences
├── tests/
│   ├── components/
│   │   ├── Sidebar.test.tsx
│   │   ├── TextEditor.test.tsx
│   │   ├── VocabCard.test.tsx
│   │   ├── FlashcardMode.test.tsx
│   │   └── QuickScanMode.test.tsx
│   └── stores/
│       ├── vocabStore.test.ts
│       └── reviewStore.test.ts
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.js
└── postcss.config.js
```

---

## Task 1: Project Scaffolding

**Files:**
- Create: All project root config files, `src-tauri/`, `src/main.tsx`, `src/App.tsx`, `index.html`

- [ ] **Step 1: Create Tauri + React project**

```bash
cd /Users/liluyao1/Desktop/poweren
npm create tauri-app@latest . -- --template react-ts --manager npm
```

Select: React, TypeScript. If the CLI asks, choose to overwrite existing files.

- [ ] **Step 2: Install frontend dependencies**

```bash
npm install zustand react-router-dom
npm install -D tailwindcss @tailwindcss/vite vitest @testing-library/react @testing-library/jest-dom jsdom
```

- [ ] **Step 3: Configure Tailwind CSS**

Update `src/styles.css`:

```css
@import "tailwindcss";
```

Update `vite.config.ts`:

```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: "./tests/setup.ts",
  },
});
```

Create `tests/setup.ts`:

```typescript
import "@testing-library/jest-dom/vitest";
```

- [ ] **Step 4: Add tauri-plugin-sql to Rust backend**

```bash
cd src-tauri
cargo add tauri-plugin-sql --features sqlite
cargo add serde --features derive
cargo add serde_json
cargo add reqwest --features json,rustls-tls --no-default-features
cargo add tokio --features full
cargo add keyring
cd ..
```

Also add the plugin to `src-tauri/tauri.conf.json` under `plugins`.

- [ ] **Step 5: Verify project builds**

```bash
npm run tauri dev
```

Expected: Tauri window opens with default React template content. Close it.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: scaffold Tauri + React + TypeScript project"
```

---

## Task 2: Database Schema & Initialization

**Files:**
- Create: `src-tauri/src/db.rs`
- Modify: `src-tauri/src/lib.rs`

- [ ] **Step 1: Write db.rs with schema migration**

Create `src-tauri/src/db.rs`:

```rust
use tauri_plugin_sql::{Migration, MigrationKind};

pub fn get_migrations() -> Vec<Migration> {
    vec![Migration {
        version: 1,
        description: "create initial tables",
        sql: "
            CREATE TABLE IF NOT EXISTS texts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                content TEXT NOT NULL,
                translation TEXT NOT NULL DEFAULT '',
                analysis_json TEXT NOT NULL DEFAULT '{}',
                created_at DATETIME NOT NULL DEFAULT (datetime('now'))
            );

            CREATE TABLE IF NOT EXISTS vocabulary (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                word TEXT NOT NULL UNIQUE,
                type TEXT NOT NULL CHECK(type IN ('word', 'phrase')),
                definition TEXT NOT NULL DEFAULT '',
                phonetic TEXT DEFAULT '',
                status TEXT NOT NULL DEFAULT 'new' CHECK(status IN ('new', 'learning', 'mastered')),
                tags TEXT NOT NULL DEFAULT '[]',
                created_at DATETIME NOT NULL DEFAULT (datetime('now')),
                updated_at DATETIME NOT NULL DEFAULT (datetime('now'))
            );

            CREATE TABLE IF NOT EXISTS vocab_sources (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                vocab_id INTEGER NOT NULL,
                text_id INTEGER NOT NULL,
                context_sentence TEXT NOT NULL DEFAULT '',
                FOREIGN KEY (vocab_id) REFERENCES vocabulary(id) ON DELETE CASCADE,
                FOREIGN KEY (text_id) REFERENCES texts(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS review_schedule (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                vocab_id INTEGER NOT NULL UNIQUE,
                next_review_at DATETIME NOT NULL DEFAULT (datetime('now')),
                last_reviewed_at DATETIME,
                interval_level INTEGER NOT NULL DEFAULT 0,
                consecutive_correct INTEGER NOT NULL DEFAULT 0,
                review_count INTEGER NOT NULL DEFAULT 0,
                FOREIGN KEY (vocab_id) REFERENCES vocabulary(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS review_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                vocab_id INTEGER,
                reviewed_at DATETIME NOT NULL DEFAULT (datetime('now')),
                mode TEXT NOT NULL CHECK(mode IN ('flashcard', 'quick_scan')),
                sub_mode TEXT NOT NULL,
                result TEXT NOT NULL CHECK(result IN ('forgot', 'fuzzy', 'remembered')),
                FOREIGN KEY (vocab_id) REFERENCES vocabulary(id) ON DELETE SET NULL
            );

            CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            );
        ",
        kind: MigrationKind::Up,
    }]
}
```

- [ ] **Step 2: Register plugin in lib.rs**

Update `src-tauri/src/lib.rs`:

```rust
mod db;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:poweren.db", db::get_migrations())
                .build(),
        )
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

- [ ] **Step 3: Verify database initializes**

```bash
npm run tauri dev
```

Expected: App opens without errors. Check `src-tauri/poweren.db` is created. Close app.

- [ ] **Step 4: Commit**

```bash
git add src-tauri/src/db.rs src-tauri/src/lib.rs
git commit -m "feat: add SQLite database schema with migrations"
```

---

## Task 3: TypeScript Types & API Service Layer

**Files:**
- Create: `src/types.ts`, `src/services/api.ts`

- [ ] **Step 1: Define shared types**

Create `src/types.ts`:

```typescript
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
  tags: string; // JSON array string
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
```

- [ ] **Step 2: Create Tauri invoke wrappers**

Create `src/services/api.ts`:

```typescript
import Database from "@tauri-apps/plugin-sql";
import type {
  Text,
  Vocabulary,
  VocabSource,
  ReviewSchedule,
  ReviewLog,
  AnalysisResult,
  ReviewResult,
} from "../types";

let db: Database | null = null;

async function getDb(): Promise<Database> {
  if (!db) {
    db = await Database.load("sqlite:poweren.db");
  }
  return db;
}

// --- Texts ---
const MAX_TEXT_LENGTH = 3000;

export async function analyzeText(content: string): Promise<{ text_id: number; analysis: AnalysisResult }> {
  const { invoke } = await import("@tauri-apps/api/core");
  const d = await getDb();

  // Get provider from settings
  const providerRows: { value: string }[] = await d.select(
    "SELECT value FROM settings WHERE key = 'ai_provider'"
  );
  const provider = providerRows.length > 0 ? providerRows[0].value : "claude";

  // Split into segments if too long
  const segments = content.length > MAX_TEXT_LENGTH
    ? splitByParagraphs(content, MAX_TEXT_LENGTH)
    : [content];

  // Analyze each segment (AI call goes through Rust for keychain access)
  const allResults: AnalysisResult[] = [];
  for (const seg of segments) {
    const result: AnalysisResult = await invoke("call_ai_analysis", {
      content: seg,
      provider,
    });
    allResults.push(result);
  }

  // Merge results
  const merged: AnalysisResult = {
    translation: allResults.map((r) => r.translation).join("\n"),
    sentences: allResults.flatMap((r) => r.sentences),
    highlights: deduplicateHighlights(allResults.flatMap((r) => r.highlights)),
  };

  // Save to database
  const analysisJson = JSON.stringify(merged);
  await d.execute(
    "INSERT INTO texts (content, translation, analysis_json) VALUES (?, ?, ?)",
    [content, merged.translation, analysisJson]
  );
  const rows: { id: number }[] = await d.select("SELECT last_insert_rowid() as id");
  const textId = rows[0].id;

  return { text_id: textId, analysis: merged };
}

function splitByParagraphs(text: string, maxLen: number): string[] {
  const paragraphs = text.split(/\n\s*\n/);
  const segments: string[] = [];
  let current = "";
  for (const p of paragraphs) {
    if (current.length + p.length + 2 > maxLen && current.length > 0) {
      segments.push(current.trim());
      current = p;
    } else {
      current += (current ? "\n\n" : "") + p;
    }
  }
  if (current.trim()) segments.push(current.trim());
  return segments;
}

function deduplicateHighlights(highlights: AnalysisResult["highlights"]): AnalysisResult["highlights"] {
  const seen = new Set<string>();
  return highlights.filter((h) => {
    const key = h.text.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function getTexts(): Promise<Text[]> {
  const d = await getDb();
  return d.select("SELECT * FROM texts ORDER BY created_at DESC");
}

export async function deleteText(id: number): Promise<void> {
  const d = await getDb();
  await d.execute("DELETE FROM texts WHERE id = ?", [id]);
}

// --- Vocabulary ---
export async function addVocab(
  word: string,
  type: "word" | "phrase",
  definition: string,
  phonetic: string,
  textId: number,
  contextSentence: string
): Promise<Vocabulary> {
  const d = await getDb();

  // Upsert: insert or get existing
  await d.execute(
    `INSERT INTO vocabulary (word, type, definition, phonetic)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(word) DO UPDATE SET updated_at = datetime('now')`,
    [word, type, definition, phonetic]
  );

  const rows: Vocabulary[] = await d.select(
    "SELECT * FROM vocabulary WHERE word = ?",
    [word]
  );
  const vocab = rows[0];

  // Add source link
  await d.execute(
    "INSERT INTO vocab_sources (vocab_id, text_id, context_sentence) VALUES (?, ?, ?)",
    [vocab.id, textId, contextSentence]
  );

  // Create review schedule if not exists
  await d.execute(
    `INSERT OR IGNORE INTO review_schedule (vocab_id) VALUES (?)`,
    [vocab.id]
  );

  return vocab;
}

export async function addVocabManual(
  word: string,
  type: "word" | "phrase",
  definition: string
): Promise<void> {
  const d = await getDb();
  await d.execute(
    `INSERT INTO vocabulary (word, type, definition)
     VALUES (?, ?, ?)
     ON CONFLICT(word) DO UPDATE SET updated_at = datetime('now')`,
    [word, type, definition]
  );
  // Create review schedule
  const rows: { id: number }[] = await d.select(
    "SELECT id FROM vocabulary WHERE word = ?", [word]
  );
  if (rows.length > 0) {
    await d.execute(
      "INSERT OR IGNORE INTO review_schedule (vocab_id) VALUES (?)",
      [rows[0].id]
    );
  }
}

export async function getVocabs(filter?: {
  type?: string;
  status?: string;
  search?: string;
  sort?: string;
}): Promise<Vocabulary[]> {
  const d = await getDb();
  let query = "SELECT * FROM vocabulary WHERE 1=1";
  const params: unknown[] = [];

  if (filter?.type) {
    query += " AND type = ?";
    params.push(filter.type);
  }
  if (filter?.status) {
    query += " AND status = ?";
    params.push(filter.status);
  }
  if (filter?.search) {
    query += " AND (word LIKE ? OR definition LIKE ?)";
    params.push(`%${filter.search}%`, `%${filter.search}%`);
  }

  const sortMap: Record<string, string> = {
    time: "created_at DESC",
    alpha: "word ASC",
    status: "status ASC, word ASC",
  };
  query += ` ORDER BY ${sortMap[filter?.sort || "time"] || "created_at DESC"}`;
  return d.select(query, params);
}

export async function getVocabSources(vocabId: number): Promise<(VocabSource & { text_content: string })[]> {
  const d = await getDb();
  return d.select(
    `SELECT vs.*, t.content as text_content
     FROM vocab_sources vs
     JOIN texts t ON vs.text_id = t.id
     WHERE vs.vocab_id = ?`,
    [vocabId]
  );
}

export async function deleteVocab(id: number): Promise<void> {
  const d = await getDb();
  await d.execute("DELETE FROM vocabulary WHERE id = ?", [id]);
}

export async function updateVocabStatus(id: number, status: string): Promise<void> {
  const d = await getDb();
  await d.execute(
    "UPDATE vocabulary SET status = ?, updated_at = datetime('now') WHERE id = ?",
    [status, id]
  );
}

// --- Review ---
const INTERVAL_DAYS = [1, 2, 4, 7, 15, 30];

export async function getDueReviews(): Promise<ReviewSchedule[]> {
  const d = await getDb();
  return d.select(
    `SELECT rs.* FROM review_schedule rs
     JOIN vocabulary v ON rs.vocab_id = v.id
     WHERE v.status != 'mastered'
       AND rs.next_review_at <= datetime('now')
     ORDER BY rs.next_review_at ASC
     LIMIT 50`
  );
}

export async function getDueReviewCount(): Promise<number> {
  const d = await getDb();
  const rows: { count: number }[] = await d.select(
    `SELECT COUNT(*) as count FROM review_schedule rs
     JOIN vocabulary v ON rs.vocab_id = v.id
     WHERE v.status != 'mastered'
       AND rs.next_review_at <= datetime('now')`
  );
  return rows[0].count;
}

export async function submitReview(
  vocabId: number,
  mode: string,
  subMode: string,
  result: ReviewResult
): Promise<void> {
  const d = await getDb();

  // Log the review
  await d.execute(
    "INSERT INTO review_logs (vocab_id, mode, sub_mode, result) VALUES (?, ?, ?, ?)",
    [vocabId, mode, subMode, result]
  );

  // Get current schedule
  const schedules: ReviewSchedule[] = await d.select(
    "SELECT * FROM review_schedule WHERE vocab_id = ?",
    [vocabId]
  );
  if (schedules.length === 0) return;
  const schedule = schedules[0];

  let newLevel = schedule.interval_level;
  let newConsecutive = schedule.consecutive_correct;

  if (result === "remembered") {
    newConsecutive += 1;
    if (newLevel < INTERVAL_DAYS.length - 1) {
      newLevel += 1;
    }
    // Check mastery: level 5 (30 days) + 2 consecutive correct
    if (newLevel === INTERVAL_DAYS.length - 1 && newConsecutive >= 2) {
      await updateVocabStatus(vocabId, "mastered");
    }
  } else if (result === "fuzzy") {
    newConsecutive = 0;
    // Keep same level
  } else {
    // forgot
    newConsecutive = 0;
    newLevel = 0;
  }

  const intervalDays = INTERVAL_DAYS[newLevel];
  await d.execute(
    `UPDATE review_schedule
     SET next_review_at = datetime('now', '+' || ? || ' days'),
         last_reviewed_at = datetime('now'),
         interval_level = ?,
         consecutive_correct = ?,
         review_count = review_count + 1
     WHERE vocab_id = ?`,
    [intervalDays, newLevel, newConsecutive, vocabId]
  );

  // Update vocab status to learning if it was new
  await d.execute(
    "UPDATE vocabulary SET status = 'learning' WHERE id = ? AND status = 'new'",
    [vocabId]
  );
}

// --- Settings ---
export async function getSetting(key: string): Promise<string | null> {
  const d = await getDb();
  const rows: { value: string }[] = await d.select(
    "SELECT value FROM settings WHERE key = ?",
    [key]
  );
  return rows.length > 0 ? rows[0].value : null;
}

export async function saveSetting(key: string, value: string): Promise<void> {
  const d = await getDb();
  await d.execute(
    "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = ?",
    [key, value, value]
  );
}

// --- Stats ---
export async function getStats(): Promise<{
  totalVocab: number;
  newCount: number;
  learningCount: number;
  masteredCount: number;
  todayReviewed: number;
  streakDays: number;
}> {
  const d = await getDb();

  const totals: { status: string; count: number }[] = await d.select(
    "SELECT status, COUNT(*) as count FROM vocabulary GROUP BY status"
  );

  const todayRows: { count: number }[] = await d.select(
    "SELECT COUNT(*) as count FROM review_logs WHERE date(reviewed_at) = date('now')"
  );

  // Calculate streak: consecutive days with at least 1 review
  const dayRows: { day: string }[] = await d.select(
    "SELECT DISTINCT date(reviewed_at) as day FROM review_logs ORDER BY day DESC LIMIT 365"
  );

  let streak = 0;
  const today = new Date();
  for (let i = 0; i < dayRows.length; i++) {
    const expected = new Date(today);
    expected.setDate(expected.getDate() - i);
    const expectedStr = expected.toISOString().slice(0, 10);
    if (dayRows[i].day === expectedStr) {
      streak++;
    } else {
      break;
    }
  }

  const statusMap: Record<string, number> = {};
  totals.forEach((r) => (statusMap[r.status] = r.count));

  return {
    totalVocab: (statusMap["new"] || 0) + (statusMap["learning"] || 0) + (statusMap["mastered"] || 0),
    newCount: statusMap["new"] || 0,
    learningCount: statusMap["learning"] || 0,
    masteredCount: statusMap["mastered"] || 0,
    todayReviewed: todayRows[0].count,
    streakDays: streak,
  };
}
```

- [ ] **Step 3: Install tauri-apps/plugin-sql npm package**

```bash
npm install @tauri-apps/plugin-sql
```

- [ ] **Step 4: Commit**

```bash
git add src/types.ts src/services/api.ts package.json package-lock.json
git commit -m "feat: add TypeScript types and database API service layer"
```

---

## Task 4: Rust AI Integration & Keychain

**Files:**
- Create: `src-tauri/src/ai.rs`, `src-tauri/src/commands.rs`
- Modify: `src-tauri/src/lib.rs`

- [ ] **Step 1: Create AI client module**

Create `src-tauri/src/ai.rs`:

```rust
use serde::{Deserialize, Serialize};
use serde_json::Value;

#[derive(Debug, Serialize, Deserialize)]
pub struct AnalysisResult {
    pub translation: String,
    pub sentences: Vec<SentenceAnalysis>,
    pub highlights: Vec<Highlight>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SentenceAnalysis {
    pub original: String,
    pub structure: Value, // Flexible JSON structure
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Highlight {
    pub text: String,
    #[serde(rename = "type")]
    pub highlight_type: String,
    pub definition: String,
}

const SYSTEM_PROMPT: &str = r#"You are an English language analysis assistant. Analyze the given English text and return a JSON response with this exact structure:

{
  "translation": "Chinese translation of the full text",
  "sentences": [
    {
      "original": "The original sentence",
      "structure": {
        "subject": {"text": "...", "role": "主语"},
        "predicate": {"text": "...", "role": "谓语"},
        "object": {"text": "...", "role": "宾语"},
        "modifiers": [{"text": "...", "role": "状语/定语/补语/定语从句", "modifies": "what it modifies"}]
      }
    }
  ],
  "highlights": [
    {"text": "word or phrase", "type": "word or phrase", "definition": "part of speech + Chinese definition"}
  ]
}

Rules:
- Split the text into individual sentences for analysis
- Identify important vocabulary words and common phrases for highlights
- Provide accurate Chinese translations
- Return ONLY valid JSON, no other text"#;

pub async fn analyze_text(
    content: &str,
    api_key: &str,
    provider: &str,
) -> Result<AnalysisResult, String> {
    let client = reqwest::Client::new();

    let (url, body) = match provider {
        "openai" => (
            "https://api.openai.com/v1/chat/completions".to_string(),
            serde_json::json!({
                "model": "gpt-4o-mini",
                "messages": [
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": content}
                ],
                "response_format": {"type": "json_object"},
                "temperature": 0.3
            }),
        ),
        _ => (
            "https://api.anthropic.com/v1/messages".to_string(),
            serde_json::json!({
                "model": "claude-sonnet-4-20250514",
                "max_tokens": 4096,
                "system": SYSTEM_PROMPT,
                "messages": [
                    {"role": "user", "content": content}
                ]
            }),
        ),
    };

    let mut req = client.post(&url);

    if provider == "openai" {
        req = req
            .header("Authorization", format!("Bearer {}", api_key))
            .header("Content-Type", "application/json");
    } else {
        req = req
            .header("x-api-key", api_key)
            .header("anthropic-version", "2023-06-01")
            .header("Content-Type", "application/json");
    }

    let response = req.json(&body).send().await.map_err(|e| format!("API request failed: {}", e))?;

    if !response.status().is_success() {
        let status = response.status();
        let text = response.text().await.unwrap_or_default();
        return Err(format!("API error ({}): {}", status, text));
    }

    let resp_json: Value = response.json().await.map_err(|e| format!("Failed to parse response: {}", e))?;

    // Extract content based on provider
    let content_str = if provider == "openai" {
        resp_json["choices"][0]["message"]["content"]
            .as_str()
            .ok_or("Missing content in OpenAI response")?
            .to_string()
    } else {
        resp_json["content"][0]["text"]
            .as_str()
            .ok_or("Missing content in Claude response")?
            .to_string()
    };

    let analysis: AnalysisResult =
        serde_json::from_str(&content_str).map_err(|e| format!("Failed to parse analysis JSON: {}", e))?;

    Ok(analysis)
}
```

- [ ] **Step 2: Create commands.rs (AI call + Keychain)**

Create `src-tauri/src/commands.rs`:

```rust
use crate::ai;

const KEYCHAIN_SERVICE: &str = "poweren";
const KEYCHAIN_USER: &str = "api_key";

#[tauri::command]
pub async fn call_ai_analysis(
    content: String,
    provider: String,
) -> Result<serde_json::Value, String> {
    // Read API key from system keychain
    let entry = keyring::Entry::new(KEYCHAIN_SERVICE, KEYCHAIN_USER)
        .map_err(|e| format!("Keychain error: {}", e))?;
    let api_key = entry.get_password()
        .map_err(|_| "API Key not configured. Please go to Settings.".to_string())?;

    // Call AI with retry on JSON parse failure
    let analysis = ai::analyze_text(&content, &api_key, &provider).await?;
    serde_json::to_value(&analysis).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn save_api_key(key: String) -> Result<(), String> {
    let entry = keyring::Entry::new(KEYCHAIN_SERVICE, KEYCHAIN_USER)
        .map_err(|e| format!("Keychain error: {}", e))?;
    entry.set_password(&key)
        .map_err(|e| format!("Failed to save API key: {}", e))
}

#[tauri::command]
pub fn get_api_key() -> Result<String, String> {
    let entry = keyring::Entry::new(KEYCHAIN_SERVICE, KEYCHAIN_USER)
        .map_err(|e| format!("Keychain error: {}", e))?;
    entry.get_password()
        .map_err(|_| "No API key stored".to_string())
}
```

- [ ] **Step 3: Add retry logic to ai.rs**

In `ai.rs`, wrap the JSON parse in a retry:

```rust
// After getting content_str from API response:
let analysis: AnalysisResult = match serde_json::from_str(&content_str) {
    Ok(a) => a,
    Err(_) => {
        // Retry once on parse failure
        let retry_resp = req_builder_fn().send().await
            .map_err(|e| format!("Retry failed: {}", e))?;
        let retry_json: Value = retry_resp.json().await
            .map_err(|e| format!("Retry parse failed: {}", e))?;
        let retry_str = extract_content(&retry_json, provider)?;
        serde_json::from_str(&retry_str)
            .map_err(|e| format!("Analysis JSON invalid after retry: {}", e))?
    }
};
```

- [ ] **Step 4: Register commands in lib.rs**

Update `src-tauri/src/lib.rs`:

```rust
mod ai;
mod commands;

// In the builder chain:
.invoke_handler(tauri::generate_handler![
    commands::call_ai_analysis,
    commands::save_api_key,
    commands::get_api_key,
])
```

- [ ] **Step 4: Verify build**

```bash
cd src-tauri && cargo check && cd ..
```

Expected: Compiles without errors.

- [ ] **Step 5: Commit**

```bash
git add src-tauri/src/ai.rs src-tauri/src/commands/ src-tauri/src/lib.rs
git commit -m "feat: add Rust AI integration and text analysis command"
```

---

## Task 5: App Shell — Layout & Sidebar

**Files:**
- Create: `src/components/Layout.tsx`, `src/components/Sidebar.tsx`
- Modify: `src/App.tsx`
- Test: `tests/components/Sidebar.test.tsx`

- [ ] **Step 1: Write failing test for Sidebar**

Create `tests/components/Sidebar.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, vi } from "vitest";
import Sidebar from "../../src/components/Sidebar";

vi.mock("../../src/services/api", () => ({
  getDueReviewCount: vi.fn().mockResolvedValue(12),
}));

describe("Sidebar", () => {
  it("renders all navigation items", () => {
    render(
      <MemoryRouter>
        <Sidebar />
      </MemoryRouter>
    );

    expect(screen.getByText("文本输入")).toBeInTheDocument();
    expect(screen.getByText("我的词库")).toBeInTheDocument();
    expect(screen.getByText("今日复习")).toBeInTheDocument();
    expect(screen.getByText("学习统计")).toBeInTheDocument();
    expect(screen.getByText("设置")).toBeInTheDocument();
  });

  it("displays the app name", () => {
    render(
      <MemoryRouter>
        <Sidebar />
      </MemoryRouter>
    );

    expect(screen.getByText("PowerEN")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/components/Sidebar.test.tsx
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement Sidebar**

Create `src/components/Sidebar.tsx`:

```tsx
import { NavLink } from "react-router-dom";
import { useEffect, useState } from "react";
import { getDueReviewCount } from "../services/api";

const navItems = [
  { path: "/", label: "文本输入", icon: "📝" },
  { path: "/vocab", label: "我的词库", icon: "📚" },
  { path: "/review", label: "今日复习", icon: "🔄" },
  { path: "/stats", label: "学习统计", icon: "📊" },
  { path: "/settings", label: "设置", icon: "⚙️" },
];

export default function Sidebar() {
  const [dueCount, setDueCount] = useState(0);

  useEffect(() => {
    getDueReviewCount().then(setDueCount).catch(() => {});
    const timer = setInterval(() => {
      getDueReviewCount().then(setDueCount).catch(() => {});
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  return (
    <aside className="w-52 bg-[#1a1a2e] h-screen flex flex-col p-4 text-white">
      <h1 className="text-xl font-bold text-blue-400 mb-6">PowerEN</h1>

      <nav className="flex flex-col gap-1 flex-1">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                isActive
                  ? "bg-blue-500/15 text-blue-400"
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              }`
            }
          >
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-gray-700 pt-3 mt-3">
        <div className="text-xs text-gray-500">今日待复习</div>
        <div className="text-2xl font-bold text-blue-400">{dueCount} 词</div>
      </div>
    </aside>
  );
}
```

- [ ] **Step 4: Implement Layout**

Create `src/components/Layout.tsx`:

```tsx
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";

export default function Layout() {
  return (
    <div className="flex h-screen bg-[#0d1117] overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-auto p-6">
        <Outlet />
      </main>
    </div>
  );
}
```

- [ ] **Step 5: Set up App routing**

Update `src/App.tsx`:

```tsx
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";

function PlaceholderPage({ title }: { title: string }) {
  return <h2 className="text-white text-xl">{title}</h2>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<PlaceholderPage title="文本输入与分析" />} />
          <Route path="vocab" element={<PlaceholderPage title="我的词库" />} />
          <Route path="review" element={<PlaceholderPage title="今日复习" />} />
          <Route path="stats" element={<PlaceholderPage title="学习统计" />} />
          <Route path="settings" element={<PlaceholderPage title="设置" />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
```

- [ ] **Step 6: Run test to verify it passes**

```bash
npx vitest run tests/components/Sidebar.test.tsx
```

Expected: PASS

- [ ] **Step 7: Verify visual in Tauri**

```bash
npm run tauri dev
```

Expected: App shows sidebar with navigation items, clicking switches content area.

- [ ] **Step 8: Commit**

```bash
git add src/components/ src/App.tsx tests/components/
git commit -m "feat: add sidebar navigation and app layout shell"
```

---

## Task 6: Text Input & Analysis Page

**Files:**
- Create: `src/components/text/TextInputPage.tsx`, `src/components/text/TextEditor.tsx`, `src/components/text/AnalysisPanel.tsx`, `src/stores/textStore.ts`
- Modify: `src/App.tsx`

- [ ] **Step 1: Create text store**

Create `src/stores/textStore.ts`:

```typescript
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

export const useTextStore = create<TextState>((set, get) => ({
  inputText: "",
  analysis: null,
  currentTextId: null,
  isAnalyzing: false,
  error: null,

  setInputText: (text) => set({ inputText: text }),

  analyze: async () => {
    const { inputText } = get();
    if (!inputText.trim()) return;

    set({ isAnalyzing: true, error: null });
    try {
      const result = await analyzeText(inputText);
      set({
        analysis: result.analysis,
        currentTextId: result.text_id,
        isAnalyzing: false,
      });
    } catch (e) {
      set({ error: String(e), isAnalyzing: false });
    }
  },

  clear: () =>
    set({ inputText: "", analysis: null, currentTextId: null, error: null }),
}));
```

- [ ] **Step 2: Create TextEditor (left panel)**

Create `src/components/text/TextEditor.tsx`:

```tsx
import { useTextStore } from "../../stores/textStore";
import type { Highlight } from "../../types";

interface Props {
  onAddVocab: (word: string, type: "word" | "phrase", definition: string, contextSentence: string) => void;
}

export default function TextEditor({ onAddVocab }: Props) {
  const { inputText, setInputText, analysis, isAnalyzing, analyze } =
    useTextStore();

  const handleAnalyze = () => {
    analyze();
  };

  // Render highlighted text after analysis
  const renderHighlightedText = () => {
    if (!analysis) return null;

    const text = inputText;
    const highlights = analysis.highlights;

    // Find all occurrences of each highlight
    type Match = { start: number; end: number; highlight: Highlight };
    const matches: Match[] = [];

    highlights.forEach((h) => {
      let idx = 0;
      while (idx < text.length) {
        const found = text.toLowerCase().indexOf(h.text.toLowerCase(), idx);
        if (found === -1) break;
        matches.push({ start: found, end: found + h.text.length, highlight: h });
        idx = found + h.text.length;
      }
    });

    // Sort by start position, remove overlaps
    matches.sort((a, b) => a.start - b.start);
    const filtered: Match[] = [];
    let lastEnd = 0;
    for (const m of matches) {
      if (m.start >= lastEnd) {
        filtered.push(m);
        lastEnd = m.end;
      }
    }

    // Build segments
    const segments: JSX.Element[] = [];
    let pos = 0;
    filtered.forEach((m, i) => {
      if (m.start > pos) {
        segments.push(<span key={`t${i}`}>{text.slice(pos, m.start)}</span>);
      }
      const colorClass =
        m.highlight.type === "word"
          ? "text-red-400 bg-red-400/10"
          : m.highlight.type === "grammar"
            ? "text-green-400 bg-green-400/10"
            : "text-yellow-300 bg-yellow-300/10";
      segments.push(
        <span
          key={`h${i}`}
          className={`${colorClass} px-1 rounded cursor-pointer hover:opacity-80`}
          title={m.highlight.definition}
          onClick={() =>
            onAddVocab(
              m.highlight.text,
              m.highlight.type as "word" | "phrase",
              m.highlight.definition,
              text
            )
          }
        >
          {text.slice(m.start, m.end)}
        </span>
      );
      pos = m.end;
    });
    if (pos < text.length) {
      segments.push(<span key="tail">{text.slice(pos)}</span>);
    }

    return (
      <div
        className="leading-8 text-gray-200 text-sm"
        onMouseUp={handleTextSelection}
      >
        {segments}
      </div>
    );
  };

  // Handle text selection (框选加词)
  const handleTextSelection = () => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) return;
    const selectedText = selection.toString().trim();
    if (selectedText.length < 2 || selectedText.length > 100) return;

    // Show floating toolbar
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    setSelectionInfo({ text: selectedText, x: rect.left, y: rect.top - 40 });
  };

  // Add state for selection popup:
  const [selectionInfo, setSelectionInfo] = useState<{
    text: string; x: number; y: number;
  } | null>(null);

  return (
    <div className="flex flex-col h-full relative">
      <h3 className="text-white font-semibold mb-3">英文原文</h3>

      {/* Floating add-to-vocab button */}
      {selectionInfo && (
        <div
          className="fixed bg-blue-500 text-white px-3 py-1 rounded-lg text-xs cursor-pointer z-50 shadow-lg"
          style={{ left: selectionInfo.x, top: selectionInfo.y }}
          onClick={() => {
            onAddVocab(selectionInfo.text, "phrase", "", inputText);
            setSelectionInfo(null);
            window.getSelection()?.removeAllRanges();
          }}
        >
          加入词库
        </div>
      )}

      {!analysis ? (
        <>
          <textarea
            className="flex-1 bg-[#161b22] border border-gray-700 rounded-lg p-3 text-gray-200 text-sm resize-none focus:outline-none focus:border-blue-500"
            placeholder="粘贴英文文本到这里..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
          />
          <button
            onClick={handleAnalyze}
            disabled={isAnalyzing || !inputText.trim()}
            className="mt-3 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm transition-colors"
          >
            {isAnalyzing ? "分析中..." : "分析"}
          </button>
        </>
      ) : (
        <div className="flex-1 bg-[#161b22] border border-gray-700 rounded-lg p-4 overflow-auto">
          {renderHighlightedText()}
          <p className="text-xs text-gray-500 mt-4">
            点击高亮词汇可加入词库
          </p>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Create AnalysisPanel (right panel)**

Create `src/components/text/AnalysisPanel.tsx`:

```tsx
import { useTextStore } from "../../stores/textStore";

export default function AnalysisPanel() {
  const { analysis, isAnalyzing, error } = useTextStore();

  if (error) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-red-400 text-sm max-w-md">
          <p className="font-semibold mb-1">分析失败</p>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (isAnalyzing) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-gray-400 text-sm">AI 分析中，请稍候...</div>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-gray-500 text-sm">粘贴英文文本并点击分析</div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto flex flex-col gap-4">
      <h3 className="text-white font-semibold">分析结果</h3>

      {/* Translation */}
      <div className="bg-[#161b22] border border-gray-700 rounded-lg p-4">
        <div className="text-blue-400 text-xs font-semibold mb-2">
          🌐 中文翻译
        </div>
        <div className="text-gray-300 text-sm leading-relaxed">
          {analysis.translation}
        </div>
      </div>

      {/* Sentence structures */}
      {analysis.sentences.map((s, i) => (
        <div
          key={i}
          className="bg-[#161b22] border border-gray-700 rounded-lg p-4"
        >
          <div className="text-blue-400 text-xs font-semibold mb-2">
            🔍 句子 {i + 1} 结构分析
          </div>
          <p className="text-gray-400 text-xs mb-3 italic">{s.original}</p>
          <div className="flex flex-wrap gap-2">
            {s.structure.subject && (
              <span className="bg-red-400/10 text-red-400 px-2 py-1 rounded text-xs">
                {s.structure.subject.role}: {s.structure.subject.text}
              </span>
            )}
            {s.structure.predicate && (
              <span className="bg-green-400/10 text-green-400 px-2 py-1 rounded text-xs">
                {s.structure.predicate.role}: {s.structure.predicate.text}
              </span>
            )}
            {s.structure.object && (
              <span className="bg-yellow-300/10 text-yellow-300 px-2 py-1 rounded text-xs">
                {s.structure.object.role}: {s.structure.object.text}
              </span>
            )}
            {s.structure.modifiers?.map((m, j) => (
              <span
                key={j}
                className="bg-purple-400/10 text-purple-400 px-2 py-1 rounded text-xs"
              >
                {m.role}: {m.text}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Create TextInputPage container**

Create `src/components/text/TextInputPage.tsx`:

```tsx
import { useTextStore } from "../../stores/textStore";
import { addVocab } from "../../services/api";
import TextEditor from "./TextEditor";
import AnalysisPanel from "./AnalysisPanel";

export default function TextInputPage() {
  const { currentTextId, clear } = useTextStore();

  const handleAddVocab = async (
    word: string,
    type: "word" | "phrase",
    definition: string,
    contextSentence: string
  ) => {
    if (!currentTextId) return;
    try {
      await addVocab(word, type, definition, "", currentTextId, contextSentence);
      alert(`"${word}" 已加入词库`);
    } catch {
      alert("加入词库失败");
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-white text-lg font-semibold">文本输入与分析</h2>
        <button
          onClick={clear}
          className="text-gray-400 hover:text-white text-sm px-3 py-1 rounded border border-gray-700 hover:border-gray-500 transition-colors"
        >
          清空重来
        </button>
      </div>
      <div className="flex-1 flex gap-4 min-h-0">
        <div className="flex-1 flex flex-col">
          <TextEditor onAddVocab={handleAddVocab} />
        </div>
        <div className="flex-1 flex flex-col">
          <AnalysisPanel />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Update App.tsx routing**

Replace the text placeholder route in `src/App.tsx`:

```tsx
import TextInputPage from "./components/text/TextInputPage";

// Replace: <Route index element={<PlaceholderPage title="文本输入与分析" />} />
// With:
<Route index element={<TextInputPage />} />
```

- [ ] **Step 6: Verify in Tauri**

```bash
npm run tauri dev
```

Expected: Text input page shows left-right layout. Text area on left, placeholder on right.

- [ ] **Step 7: Commit**

```bash
git add src/components/text/ src/stores/textStore.ts src/App.tsx
git commit -m "feat: add text input and analysis page with left-right layout"
```

---

## Task 7: Vocabulary Page — Card Grid

**Files:**
- Create: `src/components/vocab/VocabPage.tsx`, `src/components/vocab/VocabCard.tsx`, `src/components/vocab/VocabDetail.tsx`, `src/stores/vocabStore.ts`
- Test: `tests/components/VocabCard.test.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Write failing test for VocabCard**

Create `tests/components/VocabCard.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import VocabCard from "../../src/components/vocab/VocabCard";

const mockVocab = {
  id: 1,
  word: "fundamental",
  type: "word" as const,
  definition: "adj. 基本的，根本的",
  phonetic: "/ˌfʌndəˈmentl/",
  status: "learning" as const,
  tags: "[]",
  created_at: "2026-03-28",
  updated_at: "2026-03-28",
};

describe("VocabCard", () => {
  it("renders word and definition", () => {
    render(<VocabCard vocab={mockVocab} sourceCount={3} onClick={() => {}} />);
    expect(screen.getByText("fundamental")).toBeInTheDocument();
    expect(screen.getByText("adj. 基本的，根本的")).toBeInTheDocument();
  });

  it("renders status badge", () => {
    render(<VocabCard vocab={mockVocab} sourceCount={3} onClick={() => {}} />);
    expect(screen.getByText("学习中")).toBeInTheDocument();
  });

  it("renders source count", () => {
    render(<VocabCard vocab={mockVocab} sourceCount={3} onClick={() => {}} />);
    expect(screen.getByText(/3 个来源句子/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/components/VocabCard.test.tsx
```

Expected: FAIL

- [ ] **Step 3: Implement VocabCard**

Create `src/components/vocab/VocabCard.tsx`:

```tsx
import type { Vocabulary } from "../../types";

const statusConfig = {
  new: { label: "待复习", color: "text-red-400 bg-red-400/10" },
  learning: { label: "学习中", color: "text-yellow-300 bg-yellow-300/10" },
  mastered: { label: "已掌握", color: "text-green-400 bg-green-400/10" },
};

interface Props {
  vocab: Vocabulary;
  sourceCount: number;
  onClick: () => void;
}

export default function VocabCard({ vocab, sourceCount, onClick }: Props) {
  const status = statusConfig[vocab.status];

  return (
    <div
      onClick={onClick}
      className="bg-[#161b22] border border-gray-700 rounded-lg p-4 cursor-pointer hover:border-blue-500/40 transition-colors"
    >
      <div className="flex justify-between items-start mb-2">
        <h3 className="text-white font-semibold text-sm">{vocab.word}</h3>
        <span className={`${status.color} px-2 py-0.5 rounded-full text-[10px]`}>
          {status.label}
        </span>
      </div>
      <p className="text-gray-400 text-xs mb-3">{vocab.definition}</p>
      <p className="text-blue-400 text-[10px]">
        查看 {sourceCount} 个来源句子 →
      </p>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run tests/components/VocabCard.test.tsx
```

Expected: PASS

- [ ] **Step 5: Implement vocabStore**

Create `src/stores/vocabStore.ts`:

```typescript
import { create } from "zustand";
import type { Vocabulary, VocabSource } from "../types";
import { getVocabs, getVocabSources, deleteVocab } from "../services/api";

interface VocabState {
  vocabs: Vocabulary[];
  sourceCounts: Record<number, number>;
  filter: { type?: string; status?: string; search?: string };
  selectedVocab: Vocabulary | null;
  selectedSources: (VocabSource & { text_content: string })[];
  isLoading: boolean;
  setFilter: (filter: Partial<VocabState["filter"]>) => void;
  loadVocabs: () => Promise<void>;
  selectVocab: (vocab: Vocabulary) => Promise<void>;
  closeDetail: () => void;
  removeVocab: (id: number) => Promise<void>;
}

export const useVocabStore = create<VocabState>((set, get) => ({
  vocabs: [],
  sourceCounts: {},
  filter: {},
  selectedVocab: null,
  selectedSources: [],
  isLoading: false,

  setFilter: (filter) => {
    set((s) => ({ filter: { ...s.filter, ...filter } }));
    get().loadVocabs();
  },

  loadVocabs: async () => {
    set({ isLoading: true });
    try {
      const vocabs = await getVocabs(get().filter);
      // Load source counts with single aggregation query
      const d = (await import("@tauri-apps/plugin-sql")).default;
      const db = await d.load("sqlite:poweren.db");
      const countRows: { vocab_id: number; count: number }[] = await db.select(
        "SELECT vocab_id, COUNT(*) as count FROM vocab_sources GROUP BY vocab_id"
      );
      const counts: Record<number, number> = {};
      countRows.forEach((r) => (counts[r.vocab_id] = r.count));
      set({ vocabs, sourceCounts: counts, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  selectVocab: async (vocab) => {
    const sources = await getVocabSources(vocab.id);
    set({ selectedVocab: vocab, selectedSources: sources });
  },

  closeDetail: () => set({ selectedVocab: null, selectedSources: [] }),

  removeVocab: async (id) => {
    await deleteVocab(id);
    set({ selectedVocab: null, selectedSources: [] });
    get().loadVocabs();
  },
}));
```

- [ ] **Step 6: Implement VocabDetail modal**

Create `src/components/vocab/VocabDetail.tsx`:

```tsx
import { useVocabStore } from "../../stores/vocabStore";

export default function VocabDetail() {
  const { selectedVocab, selectedSources, closeDetail, removeVocab } =
    useVocabStore();

  if (!selectedVocab) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={closeDetail}
    >
      <div
        className="bg-[#161b22] border border-gray-700 rounded-xl p-6 max-w-lg w-full mx-4 max-h-[80vh] overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-white text-xl font-bold">
              {selectedVocab.word}
            </h2>
            {selectedVocab.phonetic && (
              <p className="text-gray-500 text-sm">{selectedVocab.phonetic}</p>
            )}
          </div>
          <button onClick={closeDetail} className="text-gray-500 hover:text-white text-lg">
            ✕
          </button>
        </div>

        <p className="text-gray-300 text-sm mb-4">{selectedVocab.definition}</p>

        <h3 className="text-blue-400 text-xs font-semibold mb-2">
          来源句子 ({selectedSources.length})
        </h3>
        <div className="flex flex-col gap-2 mb-4">
          {selectedSources.map((s) => (
            <div
              key={s.id}
              className="bg-[#0d1117] border border-gray-700 rounded-lg p-3"
            >
              <p className="text-gray-300 text-xs leading-relaxed">
                {s.context_sentence}
              </p>
            </div>
          ))}
        </div>

        <button
          onClick={() => removeVocab(selectedVocab.id)}
          className="text-red-400 text-xs hover:text-red-300 transition-colors"
        >
          从词库中删除
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 7: Implement VocabPage**

Create `src/components/vocab/VocabPage.tsx`:

```tsx
import { useEffect } from "react";
import { useVocabStore } from "../../stores/vocabStore";
import VocabCard from "./VocabCard";
import VocabDetail from "./VocabDetail";

const filters = [
  { label: "全部", value: undefined },
  { label: "单词", value: "word" },
  { label: "短语", value: "phrase" },
];

export default function VocabPage() {
  const { vocabs, sourceCounts, filter, setFilter, loadVocabs, selectVocab, isLoading } =
    useVocabStore();

  useEffect(() => {
    loadVocabs();
  }, []);

  return (
    <div className="h-full flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-3">
          <h2 className="text-white text-lg font-semibold">📚 我的词库</h2>
          <button
            onClick={() => {
              const word = prompt("输入单词或短语：");
              if (!word) return;
              const def = prompt("输入释义：") || "";
              const type = word.includes(" ") ? "phrase" : "word";
              // Manual add: no text_id, use addVocabManual
              import("../services/api").then(({ addVocabManual }) =>
                addVocabManual(word, type as "word"|"phrase", def).then(() => loadVocabs())
              );
            }}
            className="text-blue-400 hover:text-blue-300 text-xs px-2 py-1 rounded border border-blue-500/30"
          >
            + 手动添加
          </button>
        </div>
        <div className="flex gap-2">
          {filters.map((f) => (
            <button
              key={f.label}
              onClick={() => setFilter({ type: f.value })}
              className={`px-3 py-1 rounded text-xs border transition-colors ${
                filter.type === f.value
                  ? "border-blue-500 text-blue-400 bg-blue-500/10"
                  : "border-gray-700 text-gray-400 hover:text-white"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Search */}
      <input
        type="text"
        placeholder="🔍 搜索单词或短语..."
        className="bg-[#161b22] border border-gray-700 rounded-lg px-3 py-2 text-gray-200 text-sm mb-4 focus:outline-none focus:border-blue-500"
        onChange={(e) => setFilter({ search: e.target.value || undefined })}
      />

      {isLoading ? (
        <p className="text-gray-500 text-sm">加载中...</p>
      ) : vocabs.length === 0 ? (
        <p className="text-gray-500 text-sm">词库为空，去分析文本并收录单词吧</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 overflow-auto">
          {vocabs.map((v) => (
            <VocabCard
              key={v.id}
              vocab={v}
              sourceCount={sourceCounts[v.id] || 0}
              onClick={() => selectVocab(v)}
            />
          ))}
        </div>
      )}

      <VocabDetail />
    </div>
  );
}
```

- [ ] **Step 8: Update App.tsx routing**

```tsx
import VocabPage from "./components/vocab/VocabPage";

// Replace vocab placeholder:
<Route path="vocab" element={<VocabPage />} />
```

- [ ] **Step 9: Run tests**

```bash
npx vitest run
```

Expected: All tests pass.

- [ ] **Step 10: Commit**

```bash
git add src/components/vocab/ src/stores/vocabStore.ts tests/components/VocabCard.test.tsx src/App.tsx
git commit -m "feat: add vocabulary page with card grid, detail modal, and source tracing"
```

---

## Task 8: Review Module — Entry Page & Flashcard Mode

**Files:**
- Create: `src/components/review/ReviewEntryPage.tsx`, `src/components/review/FlashcardMode.tsx`, `src/stores/reviewStore.ts`
- Test: `tests/components/FlashcardMode.test.tsx`, `tests/stores/reviewStore.test.ts`
- Modify: `src/App.tsx`

- [ ] **Step 1: Write failing test for review store**

Create `tests/stores/reviewStore.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock api module
vi.mock("../../src/services/api", () => ({
  getDueReviews: vi.fn().mockResolvedValue([]),
  submitReview: vi.fn().mockResolvedValue(undefined),
  getVocabs: vi.fn().mockResolvedValue([]),
  getVocabSources: vi.fn().mockResolvedValue([]),
}));

import { useReviewStore } from "../../src/stores/reviewStore";

describe("reviewStore", () => {
  beforeEach(() => {
    useReviewStore.setState({
      items: [],
      currentIndex: 0,
      mode: null,
      flashcardSubMode: "def_to_word",
      isFlipped: false,
      isComplete: false,
    });
  });

  it("starts with no mode selected", () => {
    const state = useReviewStore.getState();
    expect(state.mode).toBeNull();
    expect(state.items).toEqual([]);
  });

  it("can set mode", () => {
    useReviewStore.getState().setMode("flashcard");
    expect(useReviewStore.getState().mode).toBe("flashcard");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/stores/reviewStore.test.ts
```

Expected: FAIL

- [ ] **Step 3: Implement reviewStore**

Create `src/stores/reviewStore.ts`:

```typescript
import { create } from "zustand";
import type {
  ReviewItem,
  ReviewMode,
  FlashcardSubMode,
  ReviewResult,
  Vocabulary,
  ReviewSchedule,
  VocabSource,
} from "../types";
import { getDueReviews, submitReview, getVocabSources } from "../services/api";
import Database from "@tauri-apps/plugin-sql";

interface ReviewState {
  items: ReviewItem[];
  currentIndex: number;
  mode: ReviewMode | null;
  flashcardSubMode: FlashcardSubMode;
  isFlipped: boolean;
  isComplete: boolean;
  userInput: string;
  isLoading: boolean;

  setMode: (mode: ReviewMode) => void;
  setFlashcardSubMode: (sub: FlashcardSubMode) => void;
  loadReviewItems: () => Promise<void>;
  flip: () => void;
  setUserInput: (input: string) => void;
  submitResult: (result: ReviewResult) => Promise<void>;
  reset: () => void;
}

export const useReviewStore = create<ReviewState>((set, get) => ({
  items: [],
  currentIndex: 0,
  mode: null,
  flashcardSubMode: "def_to_word",
  isFlipped: false,
  isComplete: false,
  userInput: "",
  isLoading: false,

  setMode: (mode) => set({ mode }),
  setFlashcardSubMode: (sub) => set({ flashcardSubMode: sub }),

  loadReviewItems: async () => {
    set({ isLoading: true });
    try {
      const schedules = await getDueReviews();
      const db = await Database.load("sqlite:poweren.db");

      const items: ReviewItem[] = [];
      for (const schedule of schedules) {
        const vocabs: Vocabulary[] = await db.select(
          "SELECT * FROM vocabulary WHERE id = ?",
          [schedule.vocab_id]
        );
        if (vocabs.length === 0) continue;

        const sources = await getVocabSources(schedule.vocab_id);
        items.push({
          vocab: vocabs[0],
          schedule,
          sources: sources as VocabSource[],
        });
      }

      set({ items, isLoading: false, currentIndex: 0, isComplete: false });
    } catch {
      set({ isLoading: false });
    }
  },

  flip: () => set({ isFlipped: true }),

  setUserInput: (input) => set({ userInput: input }),

  submitResult: async (result) => {
    const { items, currentIndex, mode, flashcardSubMode } = get();
    const item = items[currentIndex];
    if (!item) return;

    const subMode = mode === "flashcard" ? flashcardSubMode : "hide_def";
    await submitReview(item.vocab.id, mode!, subMode, result);

    const nextIndex = currentIndex + 1;
    if (nextIndex >= items.length) {
      set({ isComplete: true });
    } else {
      set({ currentIndex: nextIndex, isFlipped: false, userInput: "" });
    }
  },

  reset: () =>
    set({
      items: [],
      currentIndex: 0,
      mode: null,
      isFlipped: false,
      isComplete: false,
      userInput: "",
    }),
}));
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run tests/stores/reviewStore.test.ts
```

Expected: PASS

- [ ] **Step 5: Write failing test for FlashcardMode**

Create `tests/components/FlashcardMode.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import FlashcardMode from "../../src/components/review/FlashcardMode";
import { useReviewStore } from "../../src/stores/reviewStore";

vi.mock("@tauri-apps/plugin-sql", () => ({
  default: { load: vi.fn() },
}));

vi.mock("../../src/services/api", () => ({
  getDueReviews: vi.fn().mockResolvedValue([]),
  submitReview: vi.fn(),
  getVocabSources: vi.fn().mockResolvedValue([]),
}));

describe("FlashcardMode", () => {
  it("shows progress bar", () => {
    useReviewStore.setState({
      items: [
        {
          vocab: {
            id: 1, word: "test", type: "word", definition: "n. 测试",
            phonetic: "", status: "learning", tags: "[]",
            created_at: "", updated_at: "",
          },
          schedule: {
            id: 1, vocab_id: 1, next_review_at: "", last_reviewed_at: null,
            interval_level: 0, consecutive_correct: 0, review_count: 0,
          },
          sources: [],
        },
      ],
      currentIndex: 0,
      flashcardSubMode: "def_to_word",
      isFlipped: false,
      isComplete: false,
    });

    render(<FlashcardMode />);
    expect(screen.getByText("1 / 1")).toBeInTheDocument();
  });

  it("shows completion message when done", () => {
    useReviewStore.setState({ items: [], isComplete: true, currentIndex: 0 });
    render(<FlashcardMode />);
    expect(screen.getByText("复习完成！")).toBeInTheDocument();
  });
});
```

- [ ] **Step 6: Run test to verify it fails**

```bash
npx vitest run tests/components/FlashcardMode.test.tsx
```

Expected: FAIL

- [ ] **Step 7: Implement FlashcardMode**

Create `src/components/review/FlashcardMode.tsx`:

```tsx
import { useReviewStore } from "../../stores/reviewStore";

export default function FlashcardMode() {
  const {
    items,
    currentIndex,
    flashcardSubMode,
    isFlipped,
    isComplete,
    userInput,
    flip,
    setUserInput,
    submitResult,
    reset,
  } = useReviewStore();

  if (isComplete) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-4">
        <h2 className="text-white text-2xl font-bold">复习完成！</h2>
        <p className="text-gray-400">今日闪卡复习已全部完成</p>
        <button
          onClick={reset}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm"
        >
          返回
        </button>
      </div>
    );
  }

  const item = items[currentIndex];
  if (!item) return null;

  const showPrompt =
    flashcardSubMode === "def_to_word"
      ? item.vocab.definition
      : item.vocab.word;

  const showAnswer =
    flashcardSubMode === "def_to_word"
      ? item.vocab.word
      : item.vocab.definition;

  const isSpelling = flashcardSubMode === "spelling";
  const spellingCorrect =
    isSpelling && userInput.trim().toLowerCase() === item.vocab.word.toLowerCase();

  return (
    <div className="h-full flex flex-col items-center">
      {/* Progress */}
      <p className="text-gray-500 text-sm mb-2">
        {currentIndex + 1} / {items.length}
      </p>
      <div className="w-full max-w-md h-1 bg-gray-800 rounded mb-8">
        <div
          className="h-full bg-blue-500 rounded transition-all"
          style={{
            width: `${((currentIndex + 1) / items.length) * 100}%`,
          }}
        />
      </div>

      {/* Card */}
      <div className="bg-[#161b22] border border-gray-700 rounded-xl p-8 max-w-md w-full text-center flex-1 flex flex-col justify-center">
        <p className="text-gray-500 text-xs mb-4">
          {flashcardSubMode === "def_to_word"
            ? "看释义，想单词"
            : flashcardSubMode === "word_to_def"
              ? "看单词，想释义"
              : "拼写单词"}
        </p>

        <p className="text-white text-xl font-semibold mb-6">{showPrompt}</p>

        {/* Spelling input */}
        {isSpelling && !isFlipped && (
          <input
            type="text"
            className="bg-[#0d1117] border border-gray-600 rounded-lg px-4 py-2 text-white text-center mb-4 focus:outline-none focus:border-blue-500"
            placeholder="输入你的答案..."
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") flip();
            }}
          />
        )}

        {/* Reveal */}
        {isFlipped ? (
          <div className="border-t border-gray-700 pt-4 mt-2">
            <p
              className={`text-lg font-semibold mb-2 ${
                isSpelling
                  ? spellingCorrect
                    ? "text-green-400"
                    : "text-red-400"
                  : "text-blue-400"
              }`}
            >
              {showAnswer}
            </p>
            {item.sources.length > 0 && (
              <p className="text-gray-500 text-xs italic mt-3">
                "{item.sources[0].context_sentence}"
              </p>
            )}
          </div>
        ) : (
          <button
            onClick={flip}
            className="text-blue-400 text-sm hover:text-blue-300 mt-4"
          >
            点击翻转 / 按 Enter
          </button>
        )}
      </div>

      {/* Rating buttons */}
      {isFlipped && (
        <div className="flex gap-3 mt-6">
          <button
            onClick={() => submitResult("forgot")}
            className="bg-red-400/10 text-red-400 hover:bg-red-400/20 px-5 py-2 rounded-lg text-sm transition-colors"
          >
            不认识
          </button>
          <button
            onClick={() => submitResult("fuzzy")}
            className="bg-yellow-300/10 text-yellow-300 hover:bg-yellow-300/20 px-5 py-2 rounded-lg text-sm transition-colors"
          >
            模糊
          </button>
          <button
            onClick={() => submitResult("remembered")}
            className="bg-green-400/10 text-green-400 hover:bg-green-400/20 px-5 py-2 rounded-lg text-sm transition-colors"
          >
            记住了
          </button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 8: Implement ReviewEntryPage**

Create `src/components/review/ReviewEntryPage.tsx`:

```tsx
import { useEffect, useState } from "react";
import { useReviewStore } from "../../stores/reviewStore";
import { getDueReviewCount } from "../../services/api";
import FlashcardMode from "./FlashcardMode";
import QuickScanMode from "./QuickScanMode";

export default function ReviewEntryPage() {
  const { mode, setMode, setFlashcardSubMode, loadReviewItems, isLoading } =
    useReviewStore();
  const [dueCount, setDueCount] = useState(0);

  useEffect(() => {
    getDueReviewCount().then(setDueCount).catch(() => {});
  }, []);

  const startReview = async (selectedMode: "flashcard" | "quick_scan") => {
    setMode(selectedMode);
    await loadReviewItems();
  };

  if (mode === "flashcard") return <FlashcardMode />;
  if (mode === "quick_scan") return <QuickScanMode />;

  return (
    <div className="h-full flex flex-col items-center justify-center gap-6">
      <h2 className="text-white text-2xl font-bold">🔄 今日复习</h2>
      <p className="text-gray-400 text-sm">
        今日待复习：<span className="text-blue-400 font-bold text-lg">{dueCount}</span> 词
      </p>

      {dueCount === 0 ? (
        <p className="text-gray-500 text-sm">今日没有待复习的词汇，明天再来！</p>
      ) : (
        <div className="flex flex-col gap-4 w-full max-w-sm">
          {/* Flashcard */}
          <div className="bg-[#161b22] border border-gray-700 rounded-lg p-4">
            <h3 className="text-white font-semibold mb-2">闪卡模式</h3>
            <p className="text-gray-500 text-xs mb-3">逐个深度复习，含拼写和来源句子</p>
            <div className="flex gap-2 mb-3">
              {(["def_to_word", "word_to_def", "spelling"] as const).map((sub) => (
                <button
                  key={sub}
                  onClick={() => setFlashcardSubMode(sub)}
                  className="text-xs px-2 py-1 rounded border border-gray-600 text-gray-400 hover:text-white hover:border-gray-400 transition-colors"
                >
                  {sub === "def_to_word"
                    ? "释义→单词"
                    : sub === "word_to_def"
                      ? "单词→释义"
                      : "键盘拼写"}
                </button>
              ))}
            </div>
            <button
              onClick={() => startReview("flashcard")}
              disabled={isLoading}
              className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-600 text-white py-2 rounded-lg text-sm transition-colors"
            >
              {isLoading ? "加载中..." : "开始闪卡复习"}
            </button>
          </div>

          {/* Quick Scan */}
          <div className="bg-[#161b22] border border-gray-700 rounded-lg p-4">
            <h3 className="text-white font-semibold mb-2">速览模式</h3>
            <p className="text-gray-500 text-xs mb-3">批量快速过，左右对照隐藏</p>
            <button
              onClick={() => startReview("quick_scan")}
              disabled={isLoading}
              className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-600 text-white py-2 rounded-lg text-sm transition-colors"
            >
              {isLoading ? "加载中..." : "开始速览复习"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 9: Run tests**

```bash
npx vitest run
```

Expected: All tests pass.

- [ ] **Step 10: Update App.tsx routing**

```tsx
import ReviewEntryPage from "./components/review/ReviewEntryPage";

<Route path="review" element={<ReviewEntryPage />} />
```

- [ ] **Step 11: Commit**

```bash
git add src/components/review/ src/stores/reviewStore.ts tests/ src/App.tsx
git commit -m "feat: add review entry page and flashcard mode with Ebbinghaus algorithm"
```

---

## Task 9: Quick Scan Mode

**Files:**
- Create: `src/components/review/QuickScanMode.tsx`
- Test: `tests/components/QuickScanMode.test.tsx`

- [ ] **Step 1: Write failing test for QuickScanMode**

Create `tests/components/QuickScanMode.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import QuickScanMode from "../../src/components/review/QuickScanMode";
import { useReviewStore } from "../../src/stores/reviewStore";

vi.mock("@tauri-apps/plugin-sql", () => ({
  default: { load: vi.fn() },
}));

vi.mock("../../src/services/api", () => ({
  getDueReviews: vi.fn().mockResolvedValue([]),
  submitReview: vi.fn(),
  getVocabSources: vi.fn().mockResolvedValue([]),
}));

describe("QuickScanMode", () => {
  it("renders toggle buttons", () => {
    useReviewStore.setState({
      items: [
        {
          vocab: {
            id: 1, word: "test", type: "word", definition: "n. 测试",
            phonetic: "", status: "learning", tags: "[]",
            created_at: "", updated_at: "",
          },
          schedule: {
            id: 1, vocab_id: 1, next_review_at: "", last_reviewed_at: null,
            interval_level: 0, consecutive_correct: 0, review_count: 0,
          },
          sources: [],
        },
      ],
      currentIndex: 0,
      isComplete: false,
    });

    render(<QuickScanMode />);
    expect(screen.getByText("隐藏释义")).toBeInTheDocument();
    expect(screen.getByText("隐藏单词")).toBeInTheDocument();
    expect(screen.getByText("全部显示")).toBeInTheDocument();
  });

  it("shows completion when done", () => {
    useReviewStore.setState({ items: [], isComplete: true, currentIndex: 0 });
    render(<QuickScanMode />);
    expect(screen.getByText("复习完成！")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/components/QuickScanMode.test.tsx
```

Expected: FAIL

- [ ] **Step 3: Implement QuickScanMode**

Create `src/components/review/QuickScanMode.tsx`:

```tsx
import { useState, useCallback, useEffect } from "react";
import { useReviewStore } from "../../stores/reviewStore";

type HideMode = "hide_def" | "hide_word" | "show_all";

export default function QuickScanMode() {
  const { items, isComplete, reset } = useReviewStore();
  const [hideMode, setHideMode] = useState<HideMode>("hide_def");
  const [revealedSet, setRevealedSet] = useState<Set<number>>(new Set());
  const [resultMap, setResultMap] = useState<Record<number, "remembered" | "forgot">>({});
  const [focusIndex, setFocusIndex] = useState(0);

  const { submitResult } = useReviewStore();

  const reveal = useCallback(
    (index: number) => {
      setRevealedSet((prev) => new Set(prev).add(index));
    },
    []
  );

  const markResult = async (index: number, result: "remembered" | "forgot") => {
    const item = items[index];
    if (!item) return;

    setResultMap((prev) => ({ ...prev, [index]: result }));

    // Use the store's submit but we need to handle per-item
    const subMode = hideMode === "show_all" ? "hide_def" : hideMode;
    const { submitReview: apiSubmit } = await import("../../services/api");
    await apiSubmit(item.vocab.id, "quick_scan", subMode, result);

    // Move focus to next unrevealed
    const nextUnresolved = items.findIndex(
      (_, i) => i > index && resultMap[i] === undefined
    );
    if (nextUnresolved !== -1) {
      setFocusIndex(nextUnresolved);
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown" || e.key === " ") {
        e.preventDefault();
        if (!revealedSet.has(focusIndex)) {
          reveal(focusIndex);
        } else {
          const next = focusIndex + 1;
          if (next < items.length) setFocusIndex(next);
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [focusIndex, revealedSet, items.length, reveal]);

  if (isComplete || items.length === 0) {
    const allDone = Object.keys(resultMap).length === items.length && items.length > 0;
    if (allDone || isComplete) {
      return (
        <div className="h-full flex flex-col items-center justify-center gap-4">
          <h2 className="text-white text-2xl font-bold">复习完成！</h2>
          <button
            onClick={reset}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm"
          >
            返回
          </button>
        </div>
      );
    }
  }

  return (
    <div className="h-full flex flex-col">
      {/* Top controls */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex gap-2">
          {(
            [
              { key: "hide_def", label: "隐藏释义" },
              { key: "hide_word", label: "隐藏单词" },
              { key: "show_all", label: "全部显示" },
            ] as const
          ).map((m) => (
            <button
              key={m.key}
              onClick={() => {
                setHideMode(m.key);
                setRevealedSet(new Set());
              }}
              className={`px-3 py-1.5 rounded-md text-xs transition-colors ${
                hideMode === m.key
                  ? "bg-blue-500/15 text-blue-400 border border-blue-500"
                  : "bg-[#222] text-gray-400 border border-gray-700"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              // Fisher-Yates shuffle
              const shuffled = [...items];
              for (let i = shuffled.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
              }
              useReviewStore.setState({ items: shuffled });
              setRevealedSet(new Set());
              setResultMap({});
              setFocusIndex(0);
            }}
            className="text-gray-400 hover:text-white text-xs px-2 py-1 rounded border border-gray-700"
          >
            🔀 打乱
          </button>
          <span className="text-gray-500 text-xs">共 {items.length} 词</span>
        </div>
      </div>

      {/* Header */}
      <div className="flex px-4 py-2 text-gray-500 text-xs">
        <div className="flex-1">单词/短语</div>
        <div className="flex-1">释义</div>
        <div className="w-24 text-center">操作</div>
      </div>

      {/* Rows */}
      <div className="flex flex-col gap-1.5 overflow-auto">
        {items.map((item, i) => {
          const isRevealed = revealedSet.has(i) || hideMode === "show_all";
          const isFocus = i === focusIndex;
          const result = resultMap[i];

          const borderClass = result === "remembered"
            ? "border-green-400/30"
            : result === "forgot"
              ? "border-red-400/30"
              : isFocus
                ? "border-blue-500"
                : "border-gray-700";

          return (
            <div
              key={item.vocab.id}
              className={`flex items-center bg-[#161b22] border ${borderClass} rounded-md px-4 py-2.5`}
            >
              {/* Word column */}
              <div className="flex-1">
                {hideMode === "hide_word" && !isRevealed ? (
                  <div
                    onClick={() => reveal(i)}
                    className="bg-gray-700 rounded h-5 w-full cursor-pointer flex items-center justify-center"
                  >
                    {isFocus && (
                      <span className="text-gray-500 text-[10px]">点击揭示</span>
                    )}
                  </div>
                ) : (
                  <span
                    className={`text-sm font-medium ${
                      result === "remembered" ? "text-green-400" : "text-white"
                    }`}
                  >
                    {item.vocab.word}
                  </span>
                )}
              </div>

              {/* Definition column */}
              <div className="flex-1">
                {hideMode === "hide_def" && !isRevealed ? (
                  <div
                    onClick={() => reveal(i)}
                    className="bg-gray-700 rounded h-5 w-full cursor-pointer flex items-center justify-center"
                  >
                    {isFocus && (
                      <span className="text-gray-500 text-[10px]">点击揭示</span>
                    )}
                  </div>
                ) : (
                  <span className="text-gray-300 text-xs">
                    {item.vocab.definition}
                  </span>
                )}
              </div>

              {/* Action column */}
              <div className="w-24 flex justify-center gap-2">
                {isRevealed && result === undefined ? (
                  <>
                    <button
                      onClick={() => markResult(i, "remembered")}
                      className="text-green-400 text-sm hover:text-green-300"
                      title="记住了"
                    >
                      ✓
                    </button>
                    <button
                      onClick={() => markResult(i, "forgot")}
                      className="text-red-400 text-sm hover:text-red-300"
                      title="没记住"
                    >
                      ✗
                    </button>
                  </>
                ) : result ? (
                  <span
                    className={
                      result === "remembered" ? "text-green-400" : "text-red-400"
                    }
                  >
                    {result === "remembered" ? "✓" : "✗"}
                  </span>
                ) : (
                  <span className="text-gray-600 text-[10px]">—</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run
```

Expected: All tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/components/review/QuickScanMode.tsx tests/components/QuickScanMode.test.tsx
git commit -m "feat: add quick scan review mode with uniform-width hide bars"
```

---

## Task 10: Settings Page

**Files:**
- Create: `src/components/settings/SettingsPage.tsx`, `src/stores/settingsStore.ts`
- Modify: `src/App.tsx`

- [ ] **Step 1: Implement settingsStore**

Create `src/stores/settingsStore.ts`:

```typescript
import { create } from "zustand";
import { getSetting, saveSetting } from "../services/api";

interface SettingsState {
  apiKey: string;
  aiProvider: string;
  isLoading: boolean;
  testResult: string | null;
  loadSettings: () => Promise<void>;
  setApiKey: (key: string) => Promise<void>;
  setAiProvider: (provider: string) => Promise<void>;
  testConnection: () => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  apiKey: "",
  aiProvider: "claude",
  isLoading: false,
  testResult: null,

  loadSettings: async () => {
    const { invoke } = await import("@tauri-apps/api/core");
    let apiKey = "";
    try { apiKey = await invoke("get_api_key"); } catch { /* no key stored */ }
    const aiProvider = (await getSetting("ai_provider")) || "claude";
    set({ apiKey, aiProvider });
  },

  setApiKey: async (key) => {
    const { invoke } = await import("@tauri-apps/api/core");
    await invoke("save_api_key", { key });
    set({ apiKey: key, testResult: null });
  },

  setAiProvider: async (provider) => {
    await saveSetting("ai_provider", provider);
    set({ aiProvider: provider, testResult: null });
  },

  testConnection: async () => {
    set({ isLoading: true, testResult: null });
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      await invoke("call_ai_analysis", {
        content: "Hello",
        apiKey: get().apiKey,
        provider: get().aiProvider,
      });
      set({ testResult: "success", isLoading: false });
    } catch (e) {
      set({ testResult: String(e), isLoading: false });
    }
  },
}));
```

- [ ] **Step 2: Implement SettingsPage**

Create `src/components/settings/SettingsPage.tsx`:

```tsx
import { useEffect } from "react";
import { useSettingsStore } from "../../stores/settingsStore";

export default function SettingsPage() {
  const {
    apiKey,
    aiProvider,
    isLoading,
    testResult,
    loadSettings,
    setApiKey,
    setAiProvider,
    testConnection,
  } = useSettingsStore();

  useEffect(() => {
    loadSettings();
  }, []);

  return (
    <div className="max-w-lg">
      <h2 className="text-white text-lg font-semibold mb-6">⚙️ 设置</h2>

      {/* AI Provider */}
      <div className="mb-6">
        <label className="text-gray-400 text-sm mb-2 block">AI 服务商</label>
        <div className="flex gap-2">
          {["claude", "openai"].map((p) => (
            <button
              key={p}
              onClick={() => setAiProvider(p)}
              className={`px-4 py-2 rounded-lg text-sm border transition-colors ${
                aiProvider === p
                  ? "border-blue-500 text-blue-400 bg-blue-500/10"
                  : "border-gray-700 text-gray-400 hover:text-white"
              }`}
            >
              {p === "claude" ? "Claude" : "OpenAI"}
            </button>
          ))}
        </div>
      </div>

      {/* API Key */}
      <div className="mb-6">
        <label className="text-gray-400 text-sm mb-2 block">API Key</label>
        <input
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder={
            aiProvider === "claude"
              ? "sk-ant-..."
              : "sk-..."
          }
          className="w-full bg-[#161b22] border border-gray-700 rounded-lg px-3 py-2 text-gray-200 text-sm focus:outline-none focus:border-blue-500"
        />
      </div>

      {/* Test connection */}
      <button
        onClick={testConnection}
        disabled={isLoading || !apiKey}
        className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm transition-colors mb-4"
      >
        {isLoading ? "测试中..." : "测试连接"}
      </button>

      {testResult && (
        <p
          className={`text-sm mt-2 ${
            testResult === "success" ? "text-green-400" : "text-red-400"
          }`}
        >
          {testResult === "success" ? "✓ 连接成功" : `✗ ${testResult}`}
        </p>
      )}

      {/* Data Management */}
      <div className="border-t border-gray-700 pt-6 mt-6">
        <h3 className="text-white text-sm font-semibold mb-4">数据管理</h3>
        <div className="flex gap-3">
          <button
            onClick={async () => {
              const { save } = await import("@tauri-apps/plugin-dialog");
              const { writeTextFile } = await import("@tauri-apps/plugin-fs");
              const db = await (await import("@tauri-apps/plugin-sql")).default.load("sqlite:poweren.db");
              const vocabs = await db.select("SELECT * FROM vocabulary");
              const path = await save({ filters: [{ name: "JSON", extensions: ["json"] }] });
              if (path) await writeTextFile(path, JSON.stringify(vocabs, null, 2));
            }}
            className="text-gray-400 hover:text-white text-sm px-3 py-2 rounded border border-gray-700 hover:border-gray-500 transition-colors"
          >
            导出词库 (JSON)
          </button>
          <button
            onClick={async () => {
              if (!confirm("确定要清空所有数据吗？此操作不可撤销！")) return;
              const db = await (await import("@tauri-apps/plugin-sql")).default.load("sqlite:poweren.db");
              await db.execute("DELETE FROM review_logs");
              await db.execute("DELETE FROM review_schedule");
              await db.execute("DELETE FROM vocab_sources");
              await db.execute("DELETE FROM vocabulary");
              await db.execute("DELETE FROM texts");
              alert("数据已清空");
            }}
            className="text-red-400 hover:text-red-300 text-sm px-3 py-2 rounded border border-red-400/30 hover:border-red-400 transition-colors"
          >
            清空所有数据
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Update App.tsx routing**

```tsx
import SettingsPage from "./components/settings/SettingsPage";

<Route path="settings" element={<SettingsPage />} />
```

- [ ] **Step 4: Verify in Tauri**

```bash
npm run tauri dev
```

Expected: Settings page renders, can input API key and select provider.

- [ ] **Step 5: Commit**

```bash
git add src/components/settings/ src/stores/settingsStore.ts src/App.tsx
git commit -m "feat: add settings page with API key configuration"
```

---

## Task 11: Statistics Page

**Files:**
- Create: `src/components/stats/StatsPage.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Implement StatsPage**

Create `src/components/stats/StatsPage.tsx`:

```tsx
import { useEffect, useState } from "react";
import { getStats } from "../../services/api";

interface Stats {
  totalVocab: number;
  newCount: number;
  learningCount: number;
  masteredCount: number;
  todayReviewed: number;
  streakDays: number;
}

export default function StatsPage() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    getStats().then(setStats).catch(() => {});
  }, []);

  if (!stats) return <p className="text-gray-500 text-sm">加载中...</p>;

  const masteredPercent =
    stats.totalVocab > 0
      ? Math.round((stats.masteredCount / stats.totalVocab) * 100)
      : 0;

  return (
    <div className="max-w-2xl">
      <h2 className="text-white text-lg font-semibold mb-6">📊 学习统计</h2>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <StatCard label="总词汇量" value={stats.totalVocab} />
        <StatCard label="今日已复习" value={stats.todayReviewed} />
        <StatCard label="连续天数" value={stats.streakDays} suffix="天" />
      </div>

      {/* Status distribution */}
      <div className="bg-[#161b22] border border-gray-700 rounded-lg p-4 mb-6">
        <h3 className="text-white text-sm font-semibold mb-3">掌握率分布</h3>
        <div className="flex gap-4 mb-3">
          <StatusBadge label="待复习" count={stats.newCount} color="red" />
          <StatusBadge label="学习中" count={stats.learningCount} color="yellow" />
          <StatusBadge label="已掌握" count={stats.masteredCount} color="green" />
        </div>
        {/* Progress bar */}
        <div className="w-full h-3 bg-gray-800 rounded-full overflow-hidden flex">
          {stats.totalVocab > 0 && (
            <>
              <div
                className="bg-red-400 h-full"
                style={{ width: `${(stats.newCount / stats.totalVocab) * 100}%` }}
              />
              <div
                className="bg-yellow-400 h-full"
                style={{ width: `${(stats.learningCount / stats.totalVocab) * 100}%` }}
              />
              <div
                className="bg-green-400 h-full"
                style={{ width: `${(stats.masteredCount / stats.totalVocab) * 100}%` }}
              />
            </>
          )}
        </div>
        <p className="text-gray-500 text-xs mt-2">掌握率：{masteredPercent}%</p>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  suffix = "",
}: {
  label: string;
  value: number;
  suffix?: string;
}) {
  return (
    <div className="bg-[#161b22] border border-gray-700 rounded-lg p-4 text-center">
      <p className="text-gray-500 text-xs mb-1">{label}</p>
      <p className="text-white text-2xl font-bold">
        {value}
        {suffix && <span className="text-sm text-gray-400 ml-1">{suffix}</span>}
      </p>
    </div>
  );
}

function StatusBadge({
  label,
  count,
  color,
}: {
  label: string;
  count: number;
  color: string;
}) {
  const colors: Record<string, string> = {
    red: "text-red-400 bg-red-400/10",
    yellow: "text-yellow-300 bg-yellow-300/10",
    green: "text-green-400 bg-green-400/10",
  };
  return (
    <span className={`${colors[color]} px-3 py-1 rounded-full text-xs`}>
      {label}: {count}
    </span>
  );
}
```

- [ ] **Step 2: Update App.tsx routing**

```tsx
import StatsPage from "./components/stats/StatsPage";

<Route path="stats" element={<StatsPage />} />
```

- [ ] **Step 3: Commit**

```bash
git add src/components/stats/ src/App.tsx
git commit -m "feat: add learning statistics page"
```

---

## Task 12: Text History & Polish

**Files:**
- Create: `src/components/text/TextHistory.tsx`
- Modify: `src/components/text/TextInputPage.tsx`

- [ ] **Step 1: Implement TextHistory**

Create `src/components/text/TextHistory.tsx`:

```tsx
import { useEffect, useState } from "react";
import type { Text } from "../../types";
import { getTexts, deleteText } from "../../services/api";

interface Props {
  onSelect: (text: Text) => void;
  onClose: () => void;
}

export default function TextHistory({ onSelect, onClose }: Props) {
  const [texts, setTexts] = useState<Text[]>([]);

  useEffect(() => {
    getTexts().then(setTexts).catch(() => {});
  }, []);

  const handleDelete = async (id: number) => {
    await deleteText(id);
    setTexts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-[#161b22] border border-gray-700 rounded-xl p-6 max-w-lg w-full mx-4 max-h-[80vh] overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-white font-semibold">历史记录</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-white">✕</button>
        </div>

        {texts.length === 0 ? (
          <p className="text-gray-500 text-sm">暂无历史记录</p>
        ) : (
          <div className="flex flex-col gap-2">
            {texts.map((t) => (
              <div
                key={t.id}
                className="bg-[#0d1117] border border-gray-700 rounded-lg p-3 flex justify-between items-start"
              >
                <div
                  className="flex-1 cursor-pointer"
                  onClick={() => onSelect(t)}
                >
                  <p className="text-gray-300 text-xs line-clamp-2">
                    {t.content.slice(0, 120)}
                    {t.content.length > 120 ? "..." : ""}
                  </p>
                  <p className="text-gray-600 text-[10px] mt-1">{t.created_at}</p>
                </div>
                <button
                  onClick={() => handleDelete(t.id)}
                  className="text-gray-600 hover:text-red-400 text-xs ml-2"
                >
                  删除
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Add history button to TextInputPage**

Add to `src/components/text/TextInputPage.tsx`:

```tsx
import { useState } from "react";
import TextHistory from "./TextHistory";

// Inside component, add state:
const [showHistory, setShowHistory] = useState(false);

// Add button next to "清空重来":
<button
  onClick={() => setShowHistory(true)}
  className="text-gray-400 hover:text-white text-sm px-3 py-1 rounded border border-gray-700 hover:border-gray-500 transition-colors"
>
  历史记录
</button>

// Add modal at bottom of JSX:
{showHistory && (
  <TextHistory
    onSelect={(text) => {
      setInputText(text.content);
      // Load analysis from history
      const analysis = JSON.parse(text.analysis_json);
      useTextStore.setState({
        inputText: text.content,
        analysis,
        currentTextId: text.id,
      });
      setShowHistory(false);
    }}
    onClose={() => setShowHistory(false)}
  />
)}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/text/
git commit -m "feat: add text history modal with delete support"
```

---

## Task 13: Final Integration & Error Handling

**Files:**
- Modify: `src/services/api.ts` (add error wrapping), `src/App.tsx` (finalize routes)

- [ ] **Step 1: Add error boundary wrapping to api.ts**

Add at the top of `src/services/api.ts`:

```typescript
export class ApiError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = "ApiError";
  }
}
```

Wrap `analyzeText` to throw `ApiError` on failure with user-friendly messages.

- [ ] **Step 2: Finalize App.tsx with all routes**

Ensure all routes are registered and placeholder pages are removed:

```tsx
import TextInputPage from "./components/text/TextInputPage";
import VocabPage from "./components/vocab/VocabPage";
import ReviewEntryPage from "./components/review/ReviewEntryPage";
import StatsPage from "./components/stats/StatsPage";
import SettingsPage from "./components/settings/SettingsPage";
```

- [ ] **Step 3: Run all tests**

```bash
npx vitest run
```

Expected: All tests pass.

- [ ] **Step 4: Full Tauri build test**

```bash
npm run tauri dev
```

Expected: All modules work — navigate between pages, verify layout, check dark theme.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: finalize integration, error handling, and route wiring"
```

---

## Summary

| Task | Description | Est. Steps |
|------|-------------|-----------|
| 1 | Project Scaffolding (Tauri + React + Tailwind + Vitest) | 6 |
| 2 | Database Schema & Initialization | 4 |
| 3 | TypeScript Types & API Service Layer (incl. text segmentation) | 4 |
| 4 | Rust AI Integration & Keychain (API call + retry + secure key storage) | 5 |
| 5 | App Shell — Layout & Sidebar | 8 |
| 6 | Text Input & Analysis Page (left-right, highlights, text selection) | 7 |
| 7 | Vocabulary Page (card grid, detail, sources, manual add, sort) | 10 |
| 8 | Review Entry + Flashcard Mode | 11 |
| 9 | Quick Scan Mode (uniform hide bars, shuffle) | 5 |
| 10 | Settings Page (API config + data export/import/clear) | 5 |
| 11 | Statistics Page | 3 |
| 12 | Text History (list, search, delete) | 3 |
| 13 | Final Integration & Error Handling | 5 |
| **Total** | | **76 steps** |

### Key Decisions
- **Rust scope**: Only AI API calls + keychain. All DB ops on frontend via `@tauri-apps/plugin-sql`.
- **API Key**: Stored in system keychain (macOS Keychain), never in SQLite.
- **Text segmentation**: 3000 char max, split by paragraphs, merge results.
- **Highlight positioning**: String match (no offsets), all occurrences highlighted.
- **Quick scan "forgot"**: Maps to flashcard "forgot" (reset to level 0).
