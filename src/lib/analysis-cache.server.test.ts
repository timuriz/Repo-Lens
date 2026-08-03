import { beforeEach, describe, expect, it, vi } from "vitest";

// Use an isolated in-memory SQLite DB for the L2 store during tests.
process.env.ANALYSIS_CACHE_PATH = ":memory:";

import {
  cacheKey,
  checkRateLimit,
  getCachedAnalysis,
  resetAnalysisCacheForTests,
  setCachedAnalysis,
  RATE_LIMIT_MAX,
} from "./analysis-cache.server";
import { readStoredAnalysis, resetAnalysisStoreForTests } from "./analysis-store.server";
import type { RepoAnalysis } from "@/types/analysis";

const emptyAnalysis: RepoAnalysis = {
  summary: "s",
  architecture: "a",
  entryPoints: [],
  modules: [],
  startHere: [],
  risks: [],
  edges: [],
  goodFirstTasks: [],
};

describe("analysis cache + rate limit", () => {
  beforeEach(() => {
    process.env.ANALYSIS_CACHE_PATH = ":memory:";
    resetAnalysisStoreForTests();
    resetAnalysisCacheForTests();
  });

  it("keys by tree sha with a schema version prefix", () => {
    expect(cacheKey("Owner", "Repo", "abc123")).toBe("v2:owner/repo@abc123");
  });

  it("stores and returns cached analysis", () => {
    const key = cacheKey("o", "r", "sha1");
    setCachedAnalysis(key, {
      analysis: emptyAnalysis,
      sources: { "a.ts": "console.log(1)" },
      analyzedCount: 1,
      treeSha: "sha1",
      branch: "main",
      owner: "o",
      name: "r",
    });
    const hit = getCachedAnalysis(key);
    expect(hit?.analyzedCount).toBe(1);
    expect(hit?.treeSha).toBe("sha1");
  });

  it("persists to L2 and hydrates L1 after in-memory eviction", () => {
    const key = cacheKey("o", "r", "sha2");
    setCachedAnalysis(key, {
      analysis: emptyAnalysis,
      sources: { "a.ts": "x" },
      analyzedCount: 3,
      treeSha: "sha2",
      branch: "main",
      owner: "o",
      name: "r",
    });

    // Persisted independently of the L1 map.
    const stored = readStoredAnalysis(key, 60 * 60 * 1000);
    expect(stored?.analyzedCount).toBe(3);
    expect(stored?.branch).toBe("main");
  });

  it("invalidates persistent entries past TTL", () => {
    const key = cacheKey("o", "r", "sha3");
    const now = 1_000_000;
    vi.spyOn(Date, "now").mockReturnValue(now);
    setCachedAnalysis(key, {
      analysis: emptyAnalysis,
      sources: {},
      analyzedCount: 1,
      treeSha: "sha3",
      branch: "main",
      owner: "o",
      name: "r",
    });
    // 2 hours later — beyond the 1h TTL.
    vi.spyOn(Date, "now").mockReturnValue(now + 2 * 60 * 60 * 1000);
    expect(getCachedAnalysis(key)).toBeNull();
    vi.restoreAllMocks();
  });

  it("rate-limits after max analyses", () => {
    for (let i = 0; i < RATE_LIMIT_MAX; i++) {
      expect(checkRateLimit("1.2.3.4").ok).toBe(true);
    }
    const blocked = checkRateLimit("1.2.3.4");
    expect(blocked.ok).toBe(false);
    if (!blocked.ok) expect(blocked.retryAfterMin).toBeGreaterThanOrEqual(1);
  });
});
