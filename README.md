# RepoLens AI

**Paste a GitHub repository URL and get an interactive AI-generated onboarding map of the codebase.**

RepoLens helps developers understand unfamiliar projects faster by generating architecture summaries, entry-point paths, module maps, grounded risk findings, and a file-level navigator — not another chat wrapper over a repo dump.

---

## Why RepoLens

Most “AI for codebases” products are chat UIs. RepoLens is an **onboarding layer**:

| You get | Instead of |
| --- | --- |
| Structured brief (architecture, modules, start-here) | A wall of prose |
| Clickable file references → tree highlight + preview | Hallucinated paths |
| Calibrated findings with evidence and a "why this priority" rationale | Vague “maybe issues” |
| Heuristic tree in seconds, AI analysis in the background | Waiting for everything |

Designed for the moment you open someone else’s repo and think: *where do I even start?*

---

## Features

- **Codebase Brief** — summary, architecture overview, entry points
- **Start Here path** — ordered reading route (docs grouped, then real code)
- **Module cards** — purpose + important files as clickable chips
- **Calibrated findings** — severity (`informational`→`high`) derived deterministically from impact × likelihood, plus category, failure scenario, evidence, confidence, and a "why this priority" rationale; filter by severity or category
- **Contribution Finder** — grounded "good first tasks" with difficulty, target files, and evidence
- **Interactive file navigator** — select a path → highlight in tree → syntax-highlighted preview (Shiki)
- **Progressive UX** — file tree loads immediately; AI fills the center panel when ready
- **Honest coverage** — shows *N files analyzed* vs total repo size
- **Shareable links** — `/?repo=owner/name` (optional `&branch=…`) with a one-click Copy button
- **Architecture map** — React Flow graph from AI `edges`
- **Persistent cache + rate limit** — SQLite-backed, keyed by tree SHA; survives restarts, demo abuse is limited

---

## Share a repo

After analyzing, the URL updates to a shareable form:

```text
https://your-host/?repo=expressjs/cors
https://your-host/?repo=owner/repo&branch=develop
```

You can also paste full GitHub tree URLs:

```text
https://github.com/owner/repo/tree/feature/foo
```

---

## Quick start

### Prerequisites

- Node.js 20+
- A free [Gemini API key](https://aistudio.google.com/apikey)

### Setup

```bash
git clone https://github.com/your-username/Repo-Lens.git
cd Repo-Lens
npm install
cp .env.example .env
```

Add your key to `.env`:

```bash
GEMINI_API_KEY=your_key_here
```

### Run

```bash
npm run dev
```

Open [http://localhost:8080](http://localhost:8080), paste a public GitHub URL (e.g. `https://github.com/expressjs/cors`), and hit analyze.

### Build

```bash
npm run build
npm run preview
```

### Test

```bash
# Unit tests (Vitest)
npm test

# End-to-end smoke tests (Playwright) — first run only:
npx playwright install chromium
npm run test:e2e
```

---

## How it works

```text
GitHub URL
    │
    ▼
Server tree fetch (GitHub API) → filter noise → path-based importance scoring
    │
    ▼
Show File Tree + heuristic brief (instant)
    │
    ▼
Fetch top ~25 file contents (raw.githubusercontent.com)
    │
    ▼
Gemini structured JSON analysis (cached by tree SHA, memory + SQLite)
    │
    ▼
Brief / Modules / Map / Risks / Contribute + grounded file references
```

1. **Tree & scoring** — server-side GitHub API (optional `GITHUB_TOKEN`); ignores `node_modules`, lockfiles, build dirs.
2. **Content fetch** — raw URLs (does not burn API rate limit).
3. **Structured AI** — Gemini returns typed JSON (summary, modules, start-here, raw findings with factors + an exact quote, edges). The model describes impact/likelihood/scope — it does **not** assign severity.
4. **Grounding & calibration** — findings must quote a real line from an analyzed file (bad paths or hallucinated quotes are dropped); severity, kind, and confidence are then derived deterministically, so runs stay stable and consistent. The UI links paths to the tree and preview.

---

## Tech stack

| Layer | Stack |
| --- | --- |
| App | TanStack Start, React 19, TypeScript, Vite |
| UI | Tailwind CSS 4, shadcn/ui, React Flow |
| AI | Google Gemini (`gemini-2.5-flash`), structured JSON output |
| Highlighting | Shiki (limited language set) |
| Data | Two-tier analysis cache: in-memory L1 + optional SQLite L2 (`node:sqlite`), keyed by `owner/repo@treeSha` |
| Deploy | Cloudflare Workers via Nitro (`cloudflare-module`) + Wrangler |
| Testing | Vitest (unit) + Playwright (e2e smoke) |

---

## Environment

| Variable | Required | Description |
| --- | --- | --- |
| `GEMINI_API_KEY` | Yes (for AI) | Key from [Google AI Studio](https://aistudio.google.com/apikey) |
| `GITHUB_TOKEN` | No | Raises GitHub API limits for tree fetch |
| `ANALYSIS_CACHE_PATH` | No | Override SQLite cache location (default `data/analysis-cache.sqlite`) |

Without a Gemini key, RepoLens still loads the tree and heuristic brief; AI panels show a clear setup message.

---

## Current limitations (v1)

- Optimized for **public** GitHub repositories
- AI reads a **selected subset** of important files (~25), not every file in large monorepos
- Best signal on **TypeScript / JavaScript / Python / Swift / Kotlin**-style layouts
- Analysis cache is a **local SQLite file** in Node; on Cloudflare Workers it falls back to **in-memory only**
- Demo rate limit: limited analyses per IP per hour (cache hits don’t count; weaker on multi-isolate Workers)
- Very large repos may return a **truncated** GitHub tree — surfaced clearly in the UI

---

## Roadmap

- [x] Shareable analysis URLs (`?repo=owner/name`)
- [x] Architecture graph (React Flow) from `edges`
- [x] Cache keyed by tree SHA
- [x] Persistent cache (SQLite)
- [x] Contribution finder (“good first tasks”)
- [x] E2E smoke tests (Playwright)
- [ ] Ask-the-repo chat grounded in indexed chunks
- [ ] Private repos via GitHub OAuth

---

## Project structure

```text
src/
├── components/          # UI: tree, AI panels, risks, map, file preview
├── lib/
│   ├── api/             # Server functions (loadRepoTree, analyzeRepo, preview)
│   ├── ai.server.ts     # Gemini structured analysis
│   ├── github.server.ts # Server tree + raw file fetch
│   ├── scoring.ts       # Path-based importance
│   └── start-here.ts    # Doc grouping / onboarding path
├── routes/              # TanStack file-based routes
└── types/               # Repo + analysis types
```

---

## Contributing

Issues and PRs welcome. For large changes, open an issue first so we can align on scope.

```bash
npm run lint
npm test
npm run build
```

---

## License

MIT

---

<p align="center">
  <sub>RepoLens turns any GitHub repository into an interactive onboarding map for developers.</sub>
</p>
