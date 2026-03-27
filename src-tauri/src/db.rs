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
