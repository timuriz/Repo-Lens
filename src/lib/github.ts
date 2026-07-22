import { parseGitHubUrl, toGitHubUrl } from "./parse-github-url";
import { loadRepoTree } from "./api/repo.functions";
import type { RepoFile, RepoMeta } from "@/types/repo";

export { parseGitHubUrl, toGitHubUrl };

export interface FetchRepoResult {
  meta: RepoMeta;
  files: RepoFile[];
  truncated: boolean;
}

/** Load repo metadata + filtered file tree via server (avoids browser GitHub rate limits). */
export async function fetchRepo(url: string): Promise<FetchRepoResult> {
  const { owner, repo, branch } = parseGitHubUrl(url);
  const res = await loadRepoTree({
    data: { owner, name: repo, branch },
  });
  if (res.status === "error") throw new Error(res.message);
  return { meta: res.meta, files: res.files, truncated: res.truncated };
}
