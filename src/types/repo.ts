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
  defaultBranch: string;
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
