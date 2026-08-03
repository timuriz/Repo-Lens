// Server-only: GitHub tree + raw file content helpers.
// Tree uses the GitHub API (optional GITHUB_TOKEN for higher limits).
// File contents use raw.githubusercontent.com (does not count against API quota).

import process from "node:process";
import type { RepoFile, RepoMeta } from "@/types/repo";
import { shouldIgnoreFile } from "./filters";
import { classifyFile } from "./scoring";

const PER_FILE_LIMIT = 48_000;
const TOTAL_BUDGET = 200_000;
const CONCURRENCY = 8;

export interface FetchedFile {
  path: string;
  content: string;
  truncated: boolean;
}

export interface FetchRepoTreeResult {
  meta: RepoMeta;
  files: RepoFile[];
  truncated: boolean;
}

function githubHeaders(): HeadersInit {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "RepoPrism",
  };
  const token = process.env.GITHUB_TOKEN;
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

export async function fetchRepoTree(
  owner: string,
  repo: string,
  branch?: string,
): Promise<FetchRepoTreeResult> {
  const repoRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
    headers: githubHeaders(),
  });
  if (repoRes.status === 404) throw new Error("Repository not found");
  if (repoRes.status === 403) {
    throw new Error("GitHub API rate limit reached. Try again later or set GITHUB_TOKEN.");
  }
  if (!repoRes.ok) throw new Error(`GitHub API error (${repoRes.status})`);
  const repoData = await repoRes.json();

  const defaultBranch = repoData.default_branch as string;
  const ref = branch?.trim() || defaultBranch;

  const treeRes = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/git/trees/${encodeURIComponent(ref)}?recursive=1`,
    { headers: githubHeaders() },
  );
  if (treeRes.status === 404) {
    throw new Error(`Branch or ref "${ref}" not found in ${owner}/${repo}`);
  }
  if (!treeRes.ok) throw new Error(`Failed to load repo tree (${treeRes.status})`);
  const treeData = await treeRes.json();

  const files: RepoFile[] = (treeData.tree as Array<{ path: string; type: string; size?: number }>)
    .filter((item) => item.type === "blob")
    .filter((item) => !shouldIgnoreFile(item.path))
    .map((item) => {
      const { score, role, reason } = classifyFile(item.path);
      return { path: item.path, size: item.size ?? 0, score, role, reason };
    });

  return {
    meta: {
      owner,
      name: repo,
      branch: ref,
      defaultBranch,
      treeSha: String(treeData.sha ?? ref),
      description: repoData.description ?? null,
      stars: repoData.stargazers_count ?? 0,
      url: repoData.html_url ?? `https://github.com/${owner}/${repo}`,
    },
    files,
    truncated: Boolean(treeData.truncated),
  };
}

async function fetchRawFile(
  owner: string,
  repo: string,
  branch: string,
  path: string,
): Promise<FetchedFile | null> {
  const url = `https://raw.githubusercontent.com/${owner}/${repo}/${encodeURIComponent(branch)}/${path
    .split("/")
    .map(encodeURIComponent)
    .join("/")}`;

  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const text = await res.text();
    if (text.includes("\u0000")) return null;
    const truncated = text.length > PER_FILE_LIMIT;
    return {
      path,
      content: truncated ? text.slice(0, PER_FILE_LIMIT) : text,
      truncated,
    };
  } catch {
    return null;
  }
}

export async function fetchSingleFile(
  owner: string,
  repo: string,
  branch: string,
  path: string,
): Promise<FetchedFile | null> {
  return fetchRawFile(owner, repo, branch, path);
}

export async function fetchFileContents(
  owner: string,
  repo: string,
  branch: string,
  paths: string[],
): Promise<FetchedFile[]> {
  const results: (FetchedFile | null)[] = new Array(paths.length).fill(null);
  let cursor = 0;

  const worker = async () => {
    while (cursor < paths.length) {
      const index = cursor++;
      results[index] = await fetchRawFile(owner, repo, branch, paths[index]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, paths.length) }, worker));

  const files: FetchedFile[] = [];
  let used = 0;
  for (const file of results) {
    if (!file) continue;
    if (used + file.content.length > TOTAL_BUDGET) {
      const remaining = TOTAL_BUDGET - used;
      if (remaining < 2_000) break;
      files.push({ path: file.path, content: file.content.slice(0, remaining), truncated: true });
      break;
    }
    files.push(file);
    used += file.content.length;
  }
  return files;
}
