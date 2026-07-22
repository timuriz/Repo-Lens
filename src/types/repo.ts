export type FileRole =
  | "overview"
  | "entrypoint"
  | "api"
  | "model"
  | "ui"
  | "config"
  | "docs"
  | "other";

export interface RepoMeta {
  owner: string;
  name: string;
  /** Branch (or ref) that was analyzed. */
  branch: string;
  /** Default branch from GitHub metadata (may differ from `branch`). */
  defaultBranch: string;
  /** Git tree SHA for the loaded recursive tree — used for cache invalidation. */
  treeSha: string;
  description: string | null;
  stars: number;
  url: string;
}

export interface RepoFile {
  path: string;
  size: number;
  score: number;
  role: FileRole;
  reason: string;
}

export interface TreeNode {
  name: string;
  path: string;
  type: "file" | "dir";
  size?: number;
  score?: number;
  children?: TreeNode[];
}

export interface ParsedGitHubRef {
  owner: string;
  repo: string;
  /** Explicit branch/ref from /tree/<ref> or query; undefined → use default branch. */
  branch?: string;
}
