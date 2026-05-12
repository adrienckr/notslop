/**
 * Embedding storage. Embeddings are deterministic (same text + model → same
 * vector), so there's no TTL — write once, read forever.
 *
 * Vectors are stored as raw bytes (Float32Array buffer) to keep size sane:
 * a 1024-dim vector is 4 KB on disk. 50 posts ≈ 200 KB. The pricing call to
 * ZE is the expensive part, not the storage.
 */

import { existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";

import Database from "better-sqlite3";

import { DEFAULT_CONFIG_DIR } from "../config.js";

const DB_PATH = join(DEFAULT_CONFIG_DIR, "embeddings.sqlite");

let _db: Database.Database | null = null;

function db(): Database.Database {
  if (_db) return _db;
  const dir = dirname(DB_PATH);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  _db = new Database(DB_PATH);
  _db.pragma("journal_mode = WAL");
  _db.exec(`
    CREATE TABLE IF NOT EXISTS embeddings (
      text_hash TEXT NOT NULL,
      model TEXT NOT NULL,
      dim INTEGER NOT NULL,
      vector BLOB NOT NULL,
      created_at INTEGER NOT NULL,
      PRIMARY KEY (text_hash, model)
    );
  `);
  return _db;
}

export function embedCacheGet(textHash: string, model: string): Float32Array | null {
  const row = db()
    .prepare<[string, string], { dim: number; vector: Buffer }>(
      "SELECT dim, vector FROM embeddings WHERE text_hash = ? AND model = ?",
    )
    .get(textHash, model);
  if (!row) return null;
  // Reinterpret the bytes as Float32Array. Buffer.buffer may have offset/length
  // we need to respect.
  const buf = row.vector;
  const arr = new Float32Array(buf.buffer, buf.byteOffset, buf.byteLength / 4);
  // Defensive copy: SQLite may reuse the underlying buffer.
  return new Float32Array(arr);
}

export function embedCacheSet(textHash: string, model: string, vector: Float32Array): void {
  const buf = Buffer.from(vector.buffer, vector.byteOffset, vector.byteLength);
  db()
    .prepare(
      "INSERT OR REPLACE INTO embeddings (text_hash, model, dim, vector, created_at) VALUES (?, ?, ?, ?, ?)",
    )
    .run(textHash, model, vector.length, buf, Math.floor(Date.now() / 1000));
}

export function embedCacheClear(): void {
  db().exec("DELETE FROM embeddings");
}

export function embedCacheClose(): void {
  if (_db) {
    _db.close();
    _db = null;
  }
}
