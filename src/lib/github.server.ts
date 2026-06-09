// Server-only: downloads file contents from raw.githubusercontent.com.
// Raw requests don't count against the GitHub API rate limit, so a full
// analysis costs zero API calls on the server side.

const PER_FILE_LIMIT = 48_000; // chars per file sent to the model
const TOTAL_BUDGET = 200_000; // total chars across all files
const CONCURRENCY = 8;

export interface FetchedFile {
  path: string;
  content: string;
  truncated: boolean;
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
    // Crude binary check: raw text with NUL bytes isn't worth sending to the model.
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

  // Preserve importance order and stop once the total budget is spent.
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
