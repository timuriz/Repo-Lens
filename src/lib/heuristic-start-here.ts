import type { RepoFile } from "@/types/repo";

function isDoc(file: RepoFile): boolean {
  return file.role === "overview" || file.role === "docs";
}

/** Prefer at most one root README, then code files by score — avoids README spam. */
export function pickHeuristicStartHere(files: RepoFile[], limit = 8): RepoFile[] {
  const sorted = [...files].sort((a, b) => b.score - a.score);
  const docs = sorted.filter(isDoc);
  const code = sorted.filter((f) => !isDoc(f));

  const picked: RepoFile[] = [];
  const rootReadme = docs.find((f) => {
    const base = f.path.split("/").pop()?.toLowerCase() ?? "";
    return f.path === base || /^readme(\.md|\.rst|\.txt)?$/.test(base);
  });
  if (rootReadme) picked.push(rootReadme);
  else if (docs[0]) picked.push(docs[0]);

  for (const f of code) {
    if (picked.length >= limit) break;
    picked.push(f);
  }
  return picked;
}
