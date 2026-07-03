// Lightweight SQLite (sql.js) wrapper. Persists as base64 blob in localStorage.
// Used for a subset of operations (activity log, backup metadata) — the rest of
// the app still uses in-memory + localStorage state.

import initSqlJs, { type Database, type SqlJsStatic } from "sql.js";

const STORAGE_KEY = "stackhand-sqlite-v1";
let dbPromise: Promise<Database> | null = null;
let SQL: SqlJsStatic | null = null;

async function loadSql(): Promise<SqlJsStatic> {
  if (SQL) return SQL;
  SQL = await initSqlJs({
    locateFile: (f) => `https://sql.js.org/dist/${f}`,
  });
  return SQL;
}

function persist(db: Database) {
  try {
    const bytes = db.export();
    let bin = "";
    for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    localStorage.setItem(STORAGE_KEY, btoa(bin));
  } catch {
    /* quota — ignore */
  }
}

async function open(): Promise<Database> {
  if (dbPromise) return dbPromise;
  dbPromise = (async () => {
    const sql = await loadSql();
    let db: Database;
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const bin = atob(raw);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      db = new sql.Database(bytes);
    } else {
      db = new sql.Database();
    }
    db.run(`
      CREATE TABLE IF NOT EXISTS activity (
        id TEXT PRIMARY KEY,
        workspace_id TEXT NOT NULL,
        kind TEXT NOT NULL,
        message TEXT NOT NULL,
        ts INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_activity_ws ON activity(workspace_id, ts DESC);

      CREATE TABLE IF NOT EXISTS yaml_backups (
        id TEXT PRIMARY KEY,
        workspace_id TEXT NOT NULL,
        file_path TEXT NOT NULL,
        location TEXT NOT NULL,
        size INTEGER NOT NULL,
        ts INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_backups_ws ON yaml_backups(workspace_id, ts DESC);
    `);
    persist(db);
    return db;
  })();
  return dbPromise;
}

export async function logActivity(row: {
  id: string;
  workspaceId: string;
  kind: string;
  message: string;
  ts: number;
}) {
  const db = await open();
  db.run(
    "INSERT OR REPLACE INTO activity (id, workspace_id, kind, message, ts) VALUES (?,?,?,?,?)",
    [row.id, row.workspaceId, row.kind, row.message, row.ts],
  );
  persist(db);
}

export async function recordBackup(row: {
  id: string;
  workspaceId: string;
  filePath: string;
  location: string;
  size: number;
  ts: number;
}) {
  const db = await open();
  db.run(
    "INSERT INTO yaml_backups (id, workspace_id, file_path, location, size, ts) VALUES (?,?,?,?,?,?)",
    [row.id, row.workspaceId, row.filePath, row.location, row.size, row.ts],
  );
  persist(db);
}

export interface BackupRow {
  id: string;
  filePath: string;
  location: string;
  size: number;
  ts: number;
}

export async function listBackups(workspaceId: string, filePath?: string): Promise<BackupRow[]> {
  const db = await open();
  const stmt = filePath
    ? db.prepare(
        "SELECT id, file_path, location, size, ts FROM yaml_backups WHERE workspace_id=? AND file_path=? ORDER BY ts DESC LIMIT 50",
      )
    : db.prepare(
        "SELECT id, file_path, location, size, ts FROM yaml_backups WHERE workspace_id=? ORDER BY ts DESC LIMIT 50",
      );
  stmt.bind(filePath ? [workspaceId, filePath] : [workspaceId]);
  const rows: BackupRow[] = [];
  while (stmt.step()) {
    const r = stmt.getAsObject() as Record<string, unknown>;
    rows.push({
      id: String(r.id),
      filePath: String(r.file_path),
      location: String(r.location),
      size: Number(r.size),
      ts: Number(r.ts),
    });
  }
  stmt.free();
  return rows;
}

export async function exportSqliteFile(): Promise<Blob> {
  const db = await open();
  const bytes = db.export();
  return new Blob([bytes.buffer.slice(0) as ArrayBuffer], { type: "application/x-sqlite3" });
}
