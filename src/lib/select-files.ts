import type { RepoFile } from "@/types/repo";

// Client-safe helpers: pick which files are worth sending to the AI and
// build a compact structure summary of the whole repo for the prompt.

const MAX_FILES = 25;
const MAX_FILE_SIZE = 200_000; // skip likely-vendored/minified blobs entirely

const SKIPPED_EXTENSIONS =
  /\.(png|jpe?g|gif|webp|ico|svg|avif|woff2?|ttf|eot|otf|mp[34]|wav|webm|pdf|zip|gz|tar|wasm|lockb?|min\.js|min\.css)$/i;

function isTextCandidate(file: RepoFile): boolean {
  if (file.size > MAX_FILE_SIZE) return false;
  return !SKIPPED_EXTENSIONS.test(file.path);
}

const MANIFEST_NAMES = new Set([
  "package.json",
  "pyproject.toml",
  "requirements.txt",
  "cargo.toml",
  "go.mod",
]);

/** Top files by importance score, always including README and the project manifest. */
export function selectFilesForAnalysis(files: RepoFile[]): RepoFile[] {
  const candidates = files.filter(isTextCandidate);
  const sorted = [...candidates].sort((a, b) => b.score - a.score);

  const picked: RepoFile[] = [];
  const seen = new Set<string>();
  const push = (f: RepoFile | undefined) => {
    if (f && !seen.has(f.path)) {
      seen.add(f.path);
      picked.push(f);
    }
  };

  push(sorted.find((f) => f.role === "overview"));
  push(sorted.find((f) => MANIFEST_NAMES.has((f.path.split("/").pop() ?? "").toLowerCase())));
  for (const f of sorted) {
    if (picked.length >= MAX_FILES) break;
    push(f);
  }
  return picked;
}

/** Compact directory overview (top dirs, file counts, roles) for the AI prompt. */
export function buildStructureSummary(files: RepoFile[]): string {
  const dirs = new Map<string, { count: number; roles: Set<string> }>();
  let rootFiles = 0;

  for (const f of files) {
    const parts = f.path.split("/");
    if (parts.length === 1) {
      rootFiles += 1;
      continue;
    }
    const key = parts.length >= 3 ? `${parts[0]}/${parts[1]}` : parts[0];
    const entry = dirs.get(key) ?? { count: 0, roles: new Set<string>() };
    entry.count += 1;
    if (f.role !== "other") entry.roles.add(f.role);
    dirs.set(key, entry);
  }

  const lines = [...dirs.entries()]
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 40)
    .map(([dir, { count, roles }]) => {
      const roleTag = roles.size > 0 ? ` [${[...roles].join(", ")}]` : "";
      return `${dir}/ — ${count} files${roleTag}`;
    });

  if (rootFiles > 0) lines.unshift(`(root) — ${rootFiles} files`);
  return lines.join("\n");
}
