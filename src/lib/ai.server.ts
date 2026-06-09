import { GoogleGenAI, Type } from "@google/genai";
import { z } from "zod";

import type { RepoAnalysis } from "@/types/analysis";
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
  risks: z.array(
    z.object({
      severity: z.enum(["low", "medium", "high"]),
      kind: z.enum(["confirmed", "inferred"]),
      confidence: z.enum(["low", "medium", "high"]),
      path: z.string(),
      issue: z.string(),
      recommendation: z.string(),
      evidence: z.string(),
    }),
  ),
  edges: z.array(z.object({ from: z.string(), to: z.string(), label: z.string() })),
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
      description: "Code smells, bugs, and tech debt with evidence. Empty if none.",
      items: {
        type: Type.OBJECT,
        properties: {
          severity: {
            type: Type.STRING,
            enum: ["low", "medium", "high"],
            description:
              "high = likely bug or security issue; medium = bad practice with real impact; low = minor smell.",
          },
          kind: {
            type: Type.STRING,
            enum: ["confirmed", "inferred"],
            description:
              "confirmed = directly observed in code (typo, hardcoded URL, wildcard CORS); inferred = conclusion from README/docs/structure.",
          },
          confidence: {
            type: Type.STRING,
            enum: ["low", "medium", "high"],
            description:
              "high = direct code observation; medium = README/docs citation; low = structural guess.",
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
          evidence: {
            type: Type.STRING,
            description:
              "Quote or paraphrase from the file content that supports this finding. For inferred risks, cite what the README/docs say.",
          },
        },
        required: ["severity", "kind", "confidence", "path", "issue", "recommendation", "evidence"],
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
  },
  required: ["summary", "architecture", "entryPoints", "modules", "startHere", "risks", "edges"],
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

Risk rules:
- Put ALL findings into the top-level "risks" array — never inside modules.
- Each risk must cite the exact file path from the provided file contents.
- kind="confirmed" for issues directly visible in code: typos, hardcoded URLs, wildcard CORS, missing error handling, secrets in code.
- kind="inferred" for conclusions from README/docs or project structure (e.g. "app may not be production-ready").
- "evidence" must quote or paraphrase the supporting text from the file — never leave empty.
- confidence="high" for direct code observation; "medium" for README/docs; "low" for structural guess.
- "recommendation" must be one actionable sentence.`;

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

  const knownPaths = new Set(input.files.map((f) => f.path));
  return {
    ...analysis,
    risks: analysis.risks.filter((r) => knownPaths.has(r.path)),
  };
}
