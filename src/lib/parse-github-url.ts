import type { ParsedGitHubRef } from "@/types/repo";

/**
 * Parse GitHub URLs and shorthand:
 * - owner/repo
 * - https://github.com/owner/repo
 * - https://github.com/owner/repo/tree/branch
 * - https://github.com/owner/repo/tree/feature/foo (multi-segment ref)
 * - https://github.com/owner/repo.git
 */
export function parseGitHubUrl(input: string): ParsedGitHubRef {
  const trimmed = input.trim().replace(/\/+$/, "");

  const shorthand = trimmed.match(/^([\w.-]+)\/([\w.-]+)$/);
  if (shorthand) {
    return { owner: shorthand[1], repo: shorthand[2].replace(/\.git$/, "") };
  }

  const withTree = trimmed.match(/github\.com\/([\w.-]+)\/([\w.-]+?)(?:\.git)?\/tree\/(.+)$/i);
  if (withTree) {
    return {
      owner: withTree[1],
      repo: withTree[2],
      branch: decodeURIComponent(withTree[3].replace(/\/+$/, "")),
    };
  }

  const basic = trimmed.match(/github\.com\/([\w.-]+)\/([\w.-]+?)(?:\.git)?(?:\/|$)/i);
  if (!basic) throw new Error("Invalid GitHub URL");
  return { owner: basic[1], repo: basic[2] };
}

export function toGitHubUrl(owner: string, repo: string, branch?: string): string {
  if (branch) return `https://github.com/${owner}/${repo}/tree/${branch}`;
  return `https://github.com/${owner}/${repo}`;
}
