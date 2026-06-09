const IGNORED_PATTERNS = [
  "node_modules/",
  ".git/",
  "dist/",
  "build/",
  ".next/",
  "coverage/",
  ".turbo/",
  ".cache/",
  ".vercel/",
  ".output/",
];

const IGNORED_FILES = [
  "package-lock.json",
  "pnpm-lock.yaml",
  "yarn.lock",
  "bun.lock",
  "bun.lockb",
];

export function shouldIgnoreFile(path: string): boolean {
  if (IGNORED_PATTERNS.some((p) => path.includes(p))) return true;
  const basename = path.split("/").pop() ?? "";
  if (IGNORED_FILES.includes(basename)) return true;
  if (basename.endsWith(".min.js")) return true;
  if (basename.endsWith(".map")) return true;
  return false;
}
