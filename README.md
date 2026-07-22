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
| Confirmed vs inferred risks with evidence | Vague “maybe issues” |
| Heuristic tree in seconds, AI analysis in the background | Waiting for everything |

Designed for the moment you open someone else’s repo and think: *where do I even start?*

---

## Features

- **Codebase Brief** — summary, architecture overview, entry points
- **Start Here path** — ordered reading route (docs grouped, then real code)
- **Module cards** — purpose + important files as clickable chips
- **Risks / code smells** — severity, evidence, confidence, confirmed vs inferred
- **Interactive file navigator** — select a path → highlight in tree → syntax-highlighted preview (Shiki)
- **Progressive UX** — file tree loads immediately; AI fills the center panel when ready
- **Honest coverage** — shows *N files analyzed* vs total repo size
- **Cache + rate limit** — repeated analyses of the same repo are fast; demo abuse is limited

---

## Quick start

### Prerequisites

- Node.js 20+
- A free [Gemini API key](https://aistudio.google.com/apikey)

### Setup

```bash
git clone https://github.com/<your-username>/repo-lens.git
cd repo-lens
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

---

## How it works

```text
GitHub URL
    │
    ▼
Fetch tree (GitHub API) → filter noise → path-based importance scoring
    │
    ▼
Show File Tree + heuristic brief (instant)
    │
    ▼
Fetch top ~25 file contents (raw.githubusercontent.com)
    │
    ▼
Gemini structured JSON analysis
    │
    ▼
Brief / Modules / Risks + grounded file references
```

1. **Tree & scoring** — public GitHub API; ignores `node_modules`, lockfiles, build dirs.
2. **Content fetch** — raw URLs (does not burn API rate limit).
3. **Structured AI** — Gemini returns typed JSON (summary, modules, start-here, risks with evidence).
4. **Grounding** — risks whose paths weren’t in the analyzed set are dropped; UI links paths to the tree and preview.

---

## Tech stack

| Layer | Stack |
| --- | --- |
| App | TanStack Start, React 19, TypeScript, Vite |
| UI | Tailwind CSS 4, shadcn/ui |
| AI | Google Gemini (`gemini-2.5-flash`), structured JSON output |
| Highlighting | Shiki (VS Code grammars) |
| Data | In-memory analysis cache (per `owner/repo@branch`) |

---

## Environment

| Variable | Required | Description |
| --- | --- | --- |
| `GEMINI_API_KEY` | Yes (for AI) | Key from [Google AI Studio](https://aistudio.google.com/apikey) |

Without a key, RepoLens still loads the tree and heuristic brief; AI panels show a clear setup message.

Optional: a GitHub token is **not** required for public repos (content is loaded via raw URLs). Useful later if you add private repos or higher API quotas.

---

## Current limitations (v1)

- Optimized for **public** GitHub repositories
- AI reads a **selected subset** of important files (~25), not every file in large monorepos
- Best signal on **TypeScript / JavaScript / Python / Swift / Kotlin**-style layouts (path heuristics + multi-language highlighting)
- Analysis cache is **in-memory** (resets on server restart)
- Demo rate limit: limited analyses per IP per hour (cache hits don’t count)

---

## Roadmap

- [ ] Shareable analysis URLs (`?repo=owner/name`)
- [ ] Architecture graph (React Flow) from existing `edges` data
- [ ] Contribution finder (“good first tasks”)
- [ ] Ask-the-repo chat grounded in indexed chunks
- [ ] Persistent cache (SQLite / KV)
- [ ] Private repos via GitHub OAuth

---

## Project structure

```text
src/
├── components/          # UI: tree, AI panels, risks, file preview
├── lib/
│   ├── api/             # Server functions (analyzeRepo, preview)
│   ├── ai.server.ts     # Gemini structured analysis
│   ├── github.ts        # Client tree fetch
│   ├── github.server.ts # Raw file content fetch
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
npm run build
```

---

## License

MIT

---

<p align="center">
  <sub>RepoLens turns any GitHub repository into an interactive onboarding map for developers.</sub>
</p>
