import { GoogleGenAI, Type } from "@google/genai";
import { z } from "zod";

import type { RepoAnalysis } from "@/types/analysis";
import {
  RISK_CATEGORIES,
  RISK_IMPACTS,
  RISK_LIKELIHOODS,
  RISK_SCOPES,
  calibrateRisks,
} from "./risk-calibration";
import type { FetchedFile } from "./github.server";

const MODEL = "gemini-2.5-flash";

const analysisSchema = z.object({
  summary: z.string(),
  architecture: z.string(),
  entryPoints: z.array(z.object({ path: z.string(), role: z.string(), reason: z.string() })),
  modules: z.array(
    z.object({
      name: z.string(),
      purpose: z.string(),
      files: z.array(z.string()),
    }),
  ),
  startHere: z.array(z.object({ step: z.number(), path: z.string(), reason: z.string() })),
  // Raw findings — the model supplies factors and an exact quote; severity,
  // kind, and confidence are derived later in calibrateRisks().
  risks: z.array(
    z.object({
      category: z.enum(RISK_CATEGORIES),
      path: z.string(),
      issue: z.string(),
      recommendation: z.string(),
      scenario: z.string(),
      preconditions: z.string(),
      evidence: z.string(),
      impact: z.enum(RISK_IMPACTS),
      likelihood: z.enum(RISK_LIKELIHOODS),
      scope: z.enum(RISK_SCOPES),
    }),
  ),
  edges: z.array(z.object({ from: z.string(), to: z.string(), label: z.string() })),
  goodFirstTasks: z
    .array(
      z.object({
        title: z.string(),
        difficulty: z.enum(["easy", "medium"]),
        paths: z.array(z.string()),
        why: z.string(),
        evidence: z.string(),
      }),
    )
    .default([]),
});

const responseSchema = {
  type: Type.OBJECT,
  properties: {
    summary: {
      type: Type.STRING,
      description: "2-3 sentences: what this project does and who it is for.",
    },
    architecture: {
      type: Type.STRING,
      description:
        "Short overview of how the codebase is organized: layers, main flows, where logic lives.",
    },
    entryPoints: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          path: { type: Type.STRING, description: "Exact file path from the repo." },
          role: {
            type: Type.STRING,
            description: "Short label, e.g. 'Backend bootstrap' or 'Client entry'.",
          },
          reason: { type: Type.STRING },
        },
        required: ["path", "role", "reason"],
      },
    },
    modules: {
      type: Type.ARRAY,
      description: "4-8 logical modules of the codebase.",
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          purpose: { type: Type.STRING },
          files: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "Up to 5 most important file paths in this module.",
          },
        },
        required: ["name", "purpose", "files"],
      },
    },
    startHere: {
      type: Type.ARRAY,
      description:
        "Ordered onboarding path: max 2 doc steps, then 4-6 code entry points. Do not list every nested README separately.",
      items: {
        type: Type.OBJECT,
        properties: {
          step: { type: Type.NUMBER },
          path: { type: Type.STRING },
          reason: { type: Type.STRING },
        },
        required: ["step", "path", "reason"],
      },
    },
    risks: {
      type: Type.ARRAY,
      description:
        "Findings backed by an exact quote from a provided file. Do NOT assign a severity — describe the factors and let the tool derive priority. Empty if none.",
      items: {
        type: Type.OBJECT,
        properties: {
          category: {
            type: Type.STRING,
            enum: [...RISK_CATEGORIES],
            description:
              "Area affected: security, reliability, cost (spend/abuse), performance, maintainability, or ux.",
          },
          path: {
            type: Type.STRING,
            description: "Exact file path where the issue was observed. Must be a provided file.",
          },
          issue: { type: Type.STRING, description: "One sentence describing the problem." },
          recommendation: {
            type: Type.STRING,
            description: "One actionable sentence on how to fix it.",
          },
          scenario: {
            type: Type.STRING,
            description:
              "The concrete failure that occurs if this is left as-is. Required — never generic advice.",
          },
          preconditions: {
            type: Type.STRING,
            description:
              "The conditions under which the scenario happens (e.g. 'in production with untrusted input', 'only in large repos'). State if it is a deliberate demo trade-off.",
          },
          evidence: {
            type: Type.STRING,
            description:
              "An EXACT verbatim quote copied from the cited file's content — not a paraphrase. Findings whose quote cannot be found in the file are discarded.",
          },
          impact: {
            type: Type.STRING,
            enum: [...RISK_IMPACTS],
            description:
              "How bad the outcome is: minor (cosmetic/DX), moderate (degraded behavior), major (data loss, security breach, outage, runaway cost).",
          },
          likelihood: {
            type: Type.STRING,
            enum: [...RISK_LIKELIHOODS],
            description:
              "How probable the scenario is given the preconditions: unlikely, plausible, or likely.",
          },
          scope: {
            type: Type.STRING,
            enum: [...RISK_SCOPES],
            description: "Who is affected: local (one dev/file), multi-user, or service-wide.",
          },
        },
        required: [
          "category",
          "path",
          "issue",
          "recommendation",
          "scenario",
          "preconditions",
          "evidence",
          "impact",
          "likelihood",
          "scope",
        ],
      },
    },
    edges: {
      type: Type.ARRAY,
      description: "Dependency-flow edges between module names for a graph view.",
      items: {
        type: Type.OBJECT,
        properties: {
          from: { type: Type.STRING },
          to: { type: Type.STRING },
          label: { type: Type.STRING },
        },
        required: ["from", "to", "label"],
      },
    },
    goodFirstTasks: {
      type: Type.ARRAY,
      description:
        "3-6 concrete first contributions a new developer could make, grounded in the provided files.",
      items: {
        type: Type.OBJECT,
        properties: {
          title: {
            type: Type.STRING,
            description: "Short imperative task, e.g. 'Add loading state to UserProfile'.",
          },
          difficulty: {
            type: Type.STRING,
            enum: ["easy", "medium"],
            description: "easy = localized change; medium = touches a couple of files.",
          },
          paths: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "1-3 exact file paths from the provided files the task would touch.",
          },
          why: { type: Type.STRING, description: "One sentence on the value of this task." },
          evidence: {
            type: Type.STRING,
            description:
              "Quote or paraphrase from the cited file(s) that motivates the task (missing test, TODO, duplicated logic, etc.).",
          },
        },
        required: ["title", "difficulty", "paths", "why", "evidence"],
      },
    },
  },
  required: [
    "summary",
    "architecture",
    "entryPoints",
    "modules",
    "startHere",
    "risks",
    "edges",
    "goodFirstTasks",
  ],
} as const;

const SYSTEM_INSTRUCTION = `You are a senior software engineer writing an onboarding guide for a developer who has never seen this repository.
Base every claim strictly on the provided file structure and file contents — never invent files or paths.
Only reference file paths that appear in the provided data.
Be specific and practical: name real files, real flows, real risks. Avoid generic advice.

Start Here rules:
- Include at most 2 documentation steps (root README + one architecture/contributing doc).
- Do NOT list every nested README.md in subfolders as separate steps.
- After docs, list 4-6 code entry points (bootstrap, router, core services).
- Prefer source code files (.swift, .ts, .py, etc.) over markdown for steps after documentation.

Risk rules (calibrated — do NOT rate severity yourself):
- Put ALL findings into the top-level "risks" array — never inside modules.
- Each finding must cite the exact file path and an EXACT verbatim quote ("evidence") copied from that file. Do not paraphrase; if you cannot quote it, do not report it.
- Every finding MUST have a concrete failure "scenario" (what actually breaks) and its "preconditions" (when it happens). No generic best-practice advice.
- Describe factors, not a verdict: set "impact" (minor/moderate/major), "likelihood" (unlikely/plausible/likely), and "scope" (local/multi-user/service-wide). The tool computes severity from these.
- Reserve major impact for real damage: data loss, security breach, outage, or runaway cost. A missing lint flag, a plaintext fallback, or a limited-but-working feature is minor.
- If something is a deliberate demo/portfolio trade-off already acknowledged in code or docs, say so in "preconditions" and rate impact/likelihood accordingly instead of inflating it.
- Do NOT report style preferences, working fallbacks, or "could add more X" wishes unless there is a concrete negative scenario.
- "recommendation" must be one actionable sentence.

Good first tasks rules:
- Suggest 3-6 realistic first contributions a newcomer could ship.
- Prefer: fixing confirmed risks, adding missing tests, small UX/DX gaps, resolving TODOs, deduplicating repeated logic.
- Every task's "paths" MUST be exact file paths from the provided files — never invent paths.
- "evidence" must quote or paraphrase the file text that motivates the task — never leave empty.
- difficulty="easy" for a localized single-file change; "medium" for changes spanning a couple of files.`;

export interface AnalysisInput {
  owner: string;
  name: string;
  description: string | null;
  structure: string;
  files: FetchedFile[];
}

export async function generateAnalysis(
  apiKey: string,
  input: AnalysisInput,
): Promise<RepoAnalysis> {
  const fileSections = input.files
    .map((f) => `### ${f.path}${f.truncated ? " (truncated)" : ""}\n\`\`\`\n${f.content}\n\`\`\``)
    .join("\n\n");

  const prompt = `Repository: ${input.owner}/${input.name}
Description: ${input.description ?? "(none)"}

## Directory structure (dir — file count [roles])
${input.structure}

## Key file contents
${fileSections}

Produce the onboarding analysis as JSON.`;

  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: MODEL,
    contents: prompt,
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      responseMimeType: "application/json",
      responseSchema,
      temperature: 0.3,
    },
  });

  const text = response.text;
  if (!text) throw new Error("Empty response from Gemini");
  const analysis = analysisSchema.parse(JSON.parse(text));

  const sources = new Map(input.files.map((f) => [f.path, f.content]));
  const knownPaths = new Set(sources.keys());
  return {
    ...analysis,
    // Ground + calibrate: derive severity/kind/confidence and drop unsupported findings.
    risks: calibrateRisks(analysis.risks, sources),
    // Ground tasks: keep only paths we actually analyzed, and drop tasks left with none.
    goodFirstTasks: analysis.goodFirstTasks
      .map((t) => ({ ...t, paths: t.paths.filter((p) => knownPaths.has(p)) }))
      .filter((t) => t.paths.length > 0),
  };
}
