// Server-only SQLite L2 cache for repo analyses.
// Uses Node's built-in node:sqlite (Node 22+). Survives server restarts.

import process from "node:process";
import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

import type { RepoAnalysis } from "@/types/analysis";

export interface StoredAnalysis {
  analysis: RepoAnalysis;
  sources: Record<string, string>;
  analyzedCount: number;
  treeSha: string;
  branch: string;
  cachedAt: number;
}

const DEFAULT_PATH = "data/analysis-cache.sqlite";
const MAX_ROWS = 100;

let db: DatabaseSync | null = null;

function getDb(): DatabaseSync {
  if (db) return db;
  const path = process.env.ANALYSIS_CACHE_PATH || DEFAULT_PATH;
  if (path !== ":memory:") {
    mkdirSync(dirname(path), { recursive: true });
  }
  const instance = new DatabaseSync(path);
  instance.exec(`
    CREATE TABLE IF NOT EXISTS analyses (
      key TEXT PRIMARY KEY,
      owner TEXT NOT NULL,
      name TEXT NOT NULL,
      branch TEXT NOT NULL,
      tree_sha TEXT NOT NULL,
      analyzed_count INTEGER NOT NULL,
      analysis_json TEXT NOT NULL,
      sources_json TEXT NOT NULL,
      cached_at INTEGER NOT NULL
    );
  `);
  db = instance;
  return instance;
}

export function readStoredAnalysis(key: string, ttlMs: number): StoredAnalysis | null {
  const conn = getDb();
  const row = conn
    .prepare("SELECT * FROM analyses WHERE key = ?")
    .get(key) as Record<string, unknown> | undefined;
  if (!row) return null;

  const cachedAt = Number(row.cached_at);
  if (Date.now() - cachedAt > ttlMs) {
    conn.prepare("DELETE FROM analyses WHERE key = ?").run(key);
    return null;
  }

  try {
    return {
      analysis: JSON.parse(String(row.analysis_json)) as RepoAnalysis,
      sources: JSON.parse(String(row.sources_json)) as Record<string, string>,
      analyzedCount: Number(row.analyzed_count),
      treeSha: String(row.tree_sha),
      branch: String(row.branch),
      cachedAt,
    };
  } catch {
    conn.prepare("DELETE FROM analyses WHERE key = ?").run(key);
    return null;
  }
}

export function writeStoredAnalysis(
  key: string,
  owner: string,
  name: string,
  value: StoredAnalysis,
): void {
  const conn = getDb();
  conn
    .prepare(
      `INSERT INTO analyses
        (key, owner, name, branch, tree_sha, analyzed_count, analysis_json, sources_json, cached_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET
        branch = excluded.branch,
        tree_sha = excluded.tree_sha,
        analyzed_count = excluded.analyzed_count,
        analysis_json = excluded.analysis_json,
        sources_json = excluded.sources_json,
        cached_at = excluded.cached_at`,
    )
    .run(
      key,
      owner,
      name,
      value.branch,
      value.treeSha,
      value.analyzedCount,
      JSON.stringify(value.analysis),
      JSON.stringify(value.sources),
      value.cachedAt,
    );

  // Evict oldest rows beyond the cap.
  conn
    .prepare(
      `DELETE FROM analyses WHERE key IN (
        SELECT key FROM analyses ORDER BY cached_at DESC LIMIT -1 OFFSET ?
      )`,
    )
    .run(MAX_ROWS);
}

/** Test helper — drops all cached rows. */
export function clearStoredAnalyses(): void {
  getDb().exec("DELETE FROM analyses");
}
