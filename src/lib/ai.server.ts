import { GoogleGenAI, Type } from "@google/genai";
import { z } from "zod";

import type { RepoAnalysis } from "@/types/analysis";
import type { FetchedFile } from "./github.server";

const MODEL = "gemini-2.5-flash";

const analysisSchema = z.object({
  summary: z.string(),
  architecture: z.string(),
  entryPoints: z.array(z.object({ path: z.string(), why: z.string() })),
  modules: z.array(
    z.object({
      name: z.string(),
      purpose: z.string(),
      files: z.array(z.string()),
      risks: z.array(z.string()),
    }),
  ),
  startHere: z.array(z.object({ step: z.number(), path: z.string(), reason: z.string() })),
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
          why: { type: Type.STRING },
        },
        required: ["path", "why"],
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
          risks: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "Concrete risks or tech debt observed in the code. Empty if none.",
          },
        },
        required: ["name", "purpose", "files", "risks"],
      },
    },
    startHere: {
      type: Type.ARRAY,
      description: "Ordered reading path for a new contributor, 4-6 steps.",
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
  required: ["summary", "architecture", "entryPoints", "modules", "startHere", "edges"],
} as const;

const SYSTEM_INSTRUCTION = `You are a senior software engineer writing an onboarding guide for a developer who has never seen this repository.
Base every claim strictly on the provided file structure and file contents — never invent files or paths.
Only reference file paths that appear in the provided data.
Be specific and practical: name real files, real flows, real risks. Avoid generic advice.`;

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
  return analysisSchema.parse(JSON.parse(text));
}
