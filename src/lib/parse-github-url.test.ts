import { describe, expect, it } from "vitest";
import { parseGitHubUrl, toGitHubUrl } from "./parse-github-url";
import { shouldIgnoreFile } from "./filters";
import { classifyFile } from "./scoring";
import { selectFilesForAnalysis } from "./select-files";
import type { RepoFile } from "@/types/repo";

describe("parseGitHubUrl", () => {
  it("parses shorthand owner/repo", () => {
    expect(parseGitHubUrl("facebook/react")).toEqual({ owner: "facebook", repo: "react" });
  });

  it("parses https URL", () => {
    expect(parseGitHubUrl("https://github.com/expressjs/cors")).toEqual({
      owner: "expressjs",
      repo: "cors",
    });
  });

  it("parses /tree/branch refs", () => {
    expect(parseGitHubUrl("https://github.com/owner/repo/tree/develop")).toEqual({
      owner: "owner",
      repo: "repo",
      branch: "develop",
    });
  });

  it("parses multi-segment branch names", () => {
    expect(parseGitHubUrl("https://github.com/owner/repo/tree/feature/foo")).toEqual({
      owner: "owner",
      repo: "repo",
      branch: "feature/foo",
    });
  });

  it("strips .git suffix", () => {
    expect(parseGitHubUrl("https://github.com/owner/repo.git")).toEqual({
      owner: "owner",
      repo: "repo",
    });
  });

  it("builds shareable github urls", () => {
    expect(toGitHubUrl("a", "b")).toBe("https://github.com/a/b");
    expect(toGitHubUrl("a", "b", "main")).toBe("https://github.com/a/b/tree/main");
  });
});

describe("shouldIgnoreFile", () => {
  it("ignores node_modules and lockfiles", () => {
    expect(shouldIgnoreFile("node_modules/foo/index.js")).toBe(true);
    expect(shouldIgnoreFile("package-lock.json")).toBe(true);
    expect(shouldIgnoreFile("src/app.tsx")).toBe(false);
  });
});

describe("classifyFile", () => {
  it("scores README and entrypoints highly", () => {
    expect(classifyFile("README.md").score).toBeGreaterThan(
      classifyFile("src/utils/helper.ts").score,
    );
    expect(classifyFile("src/main.tsx").score).toBeGreaterThan(0);
  });
});

describe("selectFilesForAnalysis", () => {
  it("keeps a bounded top set and prefers overview + manifest", () => {
    const files: RepoFile[] = [
      { path: "README.md", size: 100, score: 12, role: "overview", reason: "docs" },
      { path: "package.json", size: 100, score: 5, role: "config", reason: "manifest" },
      ...Array.from({ length: 40 }, (_, i) => ({
        path: `src/file-${i}.ts`,
        size: 10,
        score: 3,
        role: "ui" as const,
        reason: "src",
      })),
    ];
    const selected = selectFilesForAnalysis(files);
    expect(selected.length).toBeLessThanOrEqual(25);
    expect(selected.some((f) => f.path === "README.md")).toBe(true);
    expect(selected.some((f) => f.path === "package.json")).toBe(true);
  });
});
