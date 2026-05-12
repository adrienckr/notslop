/**
 * Local SQLite cache with TTL. Used by platforms to avoid re-hitting external
 * APIs for the same query within a short window.
 *
 * Key shape: SHA-256 hex of `${source}:${queryString}`. Value: JSON-stringified
 * response. Expires at `created_at + ttl_seconds`.
 */

import { createHash } from "node:crypto";
import { existsSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DEFAULT_CONFIG_DIR } from "./config.js";

import Database from "better-sqlite3";
import { join } from "node:path";

const DB_PATH = join(DEFAULT_CONFIG_DIR, "cache.sqlite");

let _db: Database.Database | null = null;

function db(): Database.Database {
  if (_db) return _db;
  const dir = dirname(DB_PATH);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  _db = new Database(DB_PATH);
  _db.pragma("journal_mode = WAL");
  _db.exec(`
    CREATE TABLE IF NOT EXISTS cache (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      expires_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_cache_expires ON cache(expires_at);
  `);
  return _db;
}

export function cacheKey(source: string, queryString: string): string {
  return createHash("sha256").update(`${source}:${queryString}`).digest("hex");
}

export function cacheGet<T>(key: string): T | null {
  const row = db()
    .prepare<[string, number], { value: string }>(
      "SELECT value FROM cache WHERE key = ? AND expires_at > ?",
    )
    .get(key, Math.floor(Date.now() / 1000));
  if (!row) return null;
  try {
    return JSON.parse(row.value) as T;
  } catch {
    return null;
  }
}

export function cacheSet<T>(key: string, value: T, ttlSeconds: number): void {
  const expires = Math.floor(Date.now() / 1000) + ttlSeconds;
  db()
    .prepare("INSERT OR REPLACE INTO cache (key, value, expires_at) VALUES (?, ?, ?)")
    .run(key, JSON.stringify(value), expires);
}

export function cacheClear(): void {
  db().exec("DELETE FROM cache");
}

export function cachePurgeExpired(): void {
  db().prepare("DELETE FROM cache WHERE expires_at <= ?").run(Math.floor(Date.now() / 1000));
}

export function cacheClose(): void {
  if (_db) {
    _db.close();
    _db = null;
  }
}
