use rusqlite::{params, Connection, OptionalExtension};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::sync::Mutex;

const DB_FILENAME: &str = "distill.db";
const DEFAULT_HISTORY_LIMIT: i64 = 100;

pub struct Db {
    pub conn: Mutex<Connection>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HistoryItem {
    pub id: i64,
    #[serde(rename = "createdAt")]
    pub created_at: i64,
    #[serde(rename = "rawInput")]
    pub raw_input: String,
    #[serde(rename = "optimizedOutput")]
    pub optimized_output: String,
    pub preset: String,
    pub provider: String,
    pub model: String,
    #[serde(rename = "inputTokens")]
    pub input_tokens: Option<i64>,
    #[serde(rename = "outputTokens")]
    pub output_tokens: Option<i64>,
}

impl Db {
    pub fn open(data_dir: PathBuf) -> Result<Self, String> {
        std::fs::create_dir_all(&data_dir).map_err(|e| format!("创建数据目录失败: {e}"))?;
        let path = data_dir.join(DB_FILENAME);
        let conn = Connection::open(&path).map_err(|e| format!("打开数据库失败: {e}"))?;
        Self::migrate(&conn)?;
        Ok(Self { conn: Mutex::new(conn) })
    }

    fn migrate(conn: &Connection) -> Result<(), String> {
        conn.execute_batch(
            r#"
            CREATE TABLE IF NOT EXISTS history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                created_at INTEGER NOT NULL,
                raw_input TEXT NOT NULL,
                optimized_output TEXT NOT NULL,
                preset TEXT NOT NULL,
                provider TEXT NOT NULL,
                model TEXT NOT NULL,
                input_tokens INTEGER,
                output_tokens INTEGER
            );
            CREATE INDEX IF NOT EXISTS idx_history_created_at ON history(created_at DESC);

            CREATE TABLE IF NOT EXISTS settings (
                id INTEGER PRIMARY KEY CHECK (id = 1),
                default_preset TEXT NOT NULL DEFAULT 'distill',
                default_provider TEXT NOT NULL DEFAULT 'openrouter',
                default_model TEXT NOT NULL DEFAULT 'anthropic/claude-sonnet-4.6',
                shortcut TEXT NOT NULL DEFAULT 'CmdOrCtrl+Shift+Space',
                theme TEXT NOT NULL DEFAULT 'system',
                history_limit INTEGER NOT NULL DEFAULT 100
            );

            INSERT OR IGNORE INTO settings (id) VALUES (1);
            "#,
        )
        .map_err(|e| format!("数据库迁移失败: {e}"))?;
        Ok(())
    }

    pub fn insert_history(
        &self,
        raw_input: &str,
        optimized_output: &str,
        preset: &str,
        provider: &str,
        model: &str,
        input_tokens: Option<u32>,
        output_tokens: Option<u32>,
    ) -> Result<i64, String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        let now = current_millis();
        conn.execute(
            "INSERT INTO history (created_at, raw_input, optimized_output, preset, provider, model, input_tokens, output_tokens) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
            params![
                now,
                raw_input,
                optimized_output,
                preset,
                provider,
                model,
                input_tokens.map(|v| v as i64),
                output_tokens.map(|v| v as i64),
            ],
        )
        .map_err(|e| format!("写入历史失败: {e}"))?;

        let id = conn.last_insert_rowid();
        Self::trim_history_inner(&conn)?;
        Ok(id)
    }

    pub fn list_history(&self, limit: i64, offset: i64) -> Result<Vec<HistoryItem>, String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        let mut stmt = conn
            .prepare(
                "SELECT id, created_at, raw_input, optimized_output, preset, provider, model, input_tokens, output_tokens FROM history ORDER BY created_at DESC LIMIT ?1 OFFSET ?2",
            )
            .map_err(|e| e.to_string())?;
        let rows = stmt
            .query_map(params![limit, offset], |r| {
                Ok(HistoryItem {
                    id: r.get(0)?,
                    created_at: r.get(1)?,
                    raw_input: r.get(2)?,
                    optimized_output: r.get(3)?,
                    preset: r.get(4)?,
                    provider: r.get(5)?,
                    model: r.get(6)?,
                    input_tokens: r.get(7)?,
                    output_tokens: r.get(8)?,
                })
            })
            .map_err(|e| e.to_string())?;
        rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
    }

    pub fn delete_history(&self, id: i64) -> Result<(), String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        conn.execute("DELETE FROM history WHERE id = ?1", params![id])
            .map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn clear_history(&self) -> Result<(), String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        conn.execute("DELETE FROM history", []).map_err(|e| e.to_string())?;
        Ok(())
    }

    fn trim_history_inner(conn: &Connection) -> Result<(), String> {
        let limit: i64 = conn
            .query_row(
                "SELECT history_limit FROM settings WHERE id = 1",
                [],
                |r| r.get(0),
            )
            .optional()
            .map_err(|e| e.to_string())?
            .unwrap_or(DEFAULT_HISTORY_LIMIT);

        conn.execute(
            "DELETE FROM history WHERE id NOT IN (SELECT id FROM history ORDER BY created_at DESC LIMIT ?1)",
            params![limit],
        )
        .map_err(|e| e.to_string())?;
        Ok(())
    }
}

fn current_millis() -> i64 {
    use std::time::{SystemTime, UNIX_EPOCH};
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis() as i64)
        .unwrap_or(0)
}
