import { describe, expect, it, beforeEach } from "vitest";
import {
  cacheKey,
  checkRateLimit,
  getCachedAnalysis,
  resetAnalysisCacheForTests,
  setCachedAnalysis,
  RATE_LIMIT_MAX,
} from "./analysis-cache.server";
import type { RepoAnalysis } from "@/types/analysis";

const emptyAnalysis: RepoAnalysis = {
  summary: "s",
  architecture: "a",
  entryPoints: [],
  modules: [],
  startHere: [],
  risks: [],
  edges: [],
};

describe("analysis cache + rate limit", () => {
  beforeEach(() => {
    resetAnalysisCacheForTests();
  });

  it("keys by tree sha", () => {
    expect(cacheKey("Owner", "Repo", "abc123")).toBe("owner/repo@abc123");
  });

  it("stores and returns cached analysis", () => {
    const key = cacheKey("o", "r", "sha1");
    setCachedAnalysis(key, {
      analysis: emptyAnalysis,
      sources: { "a.ts": "console.log(1)" },
      analyzedCount: 1,
      treeSha: "sha1",
      branch: "main",
    });
    const hit = getCachedAnalysis(key);
    expect(hit?.analyzedCount).toBe(1);
    expect(hit?.treeSha).toBe("sha1");
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
