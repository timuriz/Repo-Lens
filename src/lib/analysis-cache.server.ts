import type { RepoAnalysis } from "@/types/analysis";
import {
  clearStoredAnalyses,
  readStoredAnalysis,
  resetAnalysisStoreForTests,
  writeStoredAnalysis,
} from "./analysis-store.server";

export interface CachedAnalysis {
  analysis: RepoAnalysis;
  sources: Record<string, string>;
  analyzedCount: number;
  treeSha: string;
  branch: string;
  owner: string;
  name: string;
  cachedAt: number;
}

const CACHE_TTL_MS = 60 * 60 * 1000;
const MAX_CACHE = 50;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
export const RATE_LIMIT_MAX = 8;

const analysisCache = new Map<string, CachedAnalysis>();
const rateBuckets = new Map<string, number[]>();

// Bump when the cached analysis shape changes so stale entries can't reach the
// new UI. v2 introduces calibrated risks (severity/category/scenario/rationale).
const CACHE_VERSION = "v2";

/** Cache key pinned to tree SHA so branch updates invalidate automatically. */
export function cacheKey(owner: string, name: string, treeSha: string): string {
  return `${CACHE_VERSION}:${owner.toLowerCase()}/${name.toLowerCase()}@${treeSha}`;
}

function touchL1(key: string, entry: CachedAnalysis): void {
  analysisCache.delete(key);
  if (analysisCache.size >= MAX_CACHE) {
    const oldest = analysisCache.keys().next().value;
    if (oldest) analysisCache.delete(oldest);
  }
  analysisCache.set(key, entry);
}

export function getCachedAnalysis(key: string): CachedAnalysis | null {
  // L1: in-memory.
  const entry = analysisCache.get(key);
  if (entry) {
    if (Date.now() - entry.cachedAt > CACHE_TTL_MS) {
      analysisCache.delete(key);
    } else {
      touchL1(key, entry);
      return entry;
    }
  }

  // L2: SQLite. Hydrate L1 on hit.
  try {
    const stored = readStoredAnalysis(key, CACHE_TTL_MS);
    if (stored) {
      const hydrated: CachedAnalysis = { ...stored };
      touchL1(key, hydrated);
      return hydrated;
    }
  } catch (err) {
    console.error("SQLite cache read failed:", err);
  }

  return null;
}

export function setCachedAnalysis(key: string, value: Omit<CachedAnalysis, "cachedAt">): void {
  const entry: CachedAnalysis = { ...value, cachedAt: Date.now() };
  touchL1(key, entry);

  // L2: persist. Non-fatal on failure.
  try {
    writeStoredAnalysis(key, value.owner, value.name, {
      analysis: value.analysis,
      sources: value.sources,
      analyzedCount: value.analyzedCount,
      treeSha: value.treeSha,
      branch: value.branch,
      cachedAt: entry.cachedAt,
    });
  } catch (err) {
    console.error("SQLite cache write failed:", err);
  }
}

/** Test helper — clears in-memory and persistent stores. */
export function resetAnalysisCacheForTests(): void {
  analysisCache.clear();
  rateBuckets.clear();
  try {
    clearStoredAnalyses();
  } catch {
    // ignore — store may not be initialized in some tests
  }
  resetAnalysisStoreForTests();
}

export function checkRateLimit(ip: string): { ok: true } | { ok: false; retryAfterMin: number } {
  const now = Date.now();
  const recent = (rateBuckets.get(ip) ?? []).filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  if (recent.length >= RATE_LIMIT_MAX) {
    const oldest = recent[0] ?? now;
    const retryAfterMin = Math.max(1, Math.ceil((RATE_LIMIT_WINDOW_MS - (now - oldest)) / 60_000));
    rateBuckets.set(ip, recent);
    return { ok: false, retryAfterMin };
  }
  recent.push(now);
  rateBuckets.set(ip, recent);
  return { ok: true };
}

export function isTemporaryAiError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  const lower = msg.toLowerCase();
  return (
    lower.includes('"code":503') ||
    lower.includes('"code":429') ||
    lower.includes("unavailable") ||
    lower.includes("high demand") ||
    lower.includes("resource_exhausted") ||
    lower.includes("try again later") ||
    lower.includes("empty response")
  );
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  opts: { attempts?: number; baseDelayMs?: number } = {},
): Promise<T> {
  const attempts = opts.attempts ?? 3;
  const baseDelayMs = opts.baseDelayMs ?? 1500;
  let lastErr: unknown;

  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (!isTemporaryAiError(err) || i === attempts - 1) throw err;
      const delay = baseDelayMs * 2 ** i;
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastErr;
}
