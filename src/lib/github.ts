import type { RepoFile, RepoMeta } from "@/types/repo";
import { shouldIgnoreFile } from "./filters";
import { classifyFile } from "./scoring";

export function parseGitHubUrl(input: string): { owner: string; repo: string } {
  const trimmed = input.trim();
  const shorthand = trimmed.match(/^([\w.-]+)\/([\w.-]+)$/);
  if (shorthand) return { owner: shorthand[1], repo: shorthand[2].replace(/\.git$/, "") };

  const match = trimmed.match(/github\.com\/([\w.-]+)\/([\w.-]+)/i);
  if (!match) throw new Error("Invalid GitHub URL");
  return { owner: match[1], repo: match[2].replace(/\.git$/, "") };
}

export interface FetchRepoResult {
  meta: RepoMeta;
  files: RepoFile[];
  truncated: boolean;
}

export async function fetchRepo(url: string): Promise<FetchRepoResult> {
  const { owner, repo } = parseGitHubUrl(url);

  const repoRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
    headers: { Accept: "application/vnd.github+json" },
  });
  if (repoRes.status === 404) throw new Error("Repository not found");
  if (repoRes.status === 403) throw new Error("GitHub API rate limit reached. Try again later.");
  if (!repoRes.ok) throw new Error(`GitHub API error (${repoRes.status})`);
  const repoData = await repoRes.json();

  const branch = repoData.default_branch as string;
  const treeRes = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`,
    { headers: { Accept: "application/vnd.github+json" } },
  );
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
      defaultBranch: branch,
      description: repoData.description ?? null,
      stars: repoData.stargazers_count ?? 0,
      url: repoData.html_url ?? `https://github.com/${owner}/${repo}`,
    },
    files,
    truncated: Boolean(treeData.truncated),
  };
}
