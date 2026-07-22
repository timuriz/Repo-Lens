import type { RepoAnalysis } from "@/types/analysis";

export interface CachedAnalysis {
  analysis: RepoAnalysis;
  sources: Record<string, string>;
  analyzedCount: number;
  treeSha: string;
  branch: string;
  cachedAt: number;
}

const CACHE_TTL_MS = 60 * 60 * 1000;
const MAX_CACHE = 50;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
export const RATE_LIMIT_MAX = 8;

const analysisCache = new Map<string, CachedAnalysis>();
const rateBuckets = new Map<string, number[]>();

/** Cache key pinned to tree SHA so branch updates invalidate automatically. */
export function cacheKey(owner: string, name: string, treeSha: string): string {
  return `${owner.toLowerCase()}/${name.toLowerCase()}@${treeSha}`;
}

export function getCachedAnalysis(key: string): CachedAnalysis | null {
  const entry = analysisCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.cachedAt > CACHE_TTL_MS) {
    analysisCache.delete(key);
    return null;
  }
  analysisCache.delete(key);
  analysisCache.set(key, entry);
  return entry;
}

export function setCachedAnalysis(key: string, value: Omit<CachedAnalysis, "cachedAt">): void {
  if (analysisCache.size >= MAX_CACHE) {
    const oldest = analysisCache.keys().next().value;
    if (oldest) analysisCache.delete(oldest);
  }
  analysisCache.set(key, { ...value, cachedAt: Date.now() });
}

/** Test helper — clears in-memory stores. */
export function resetAnalysisCacheForTests(): void {
  analysisCache.clear();
  rateBuckets.clear();
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
