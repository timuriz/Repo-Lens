import process from "node:process";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { fetchFileContents } from "../github.server";
import { generateAnalysis } from "../ai.server";
import type { RepoAnalysis } from "@/types/analysis";

const inputSchema = z.object({
  owner: z.string().min(1),
  name: z.string().min(1),
  branch: z.string().min(1),
  description: z.string().nullable(),
  structure: z.string().max(6_000),
  paths: z.array(z.string().min(1)).min(1).max(30),
});

export type AnalyzeRepoResult =
  | { status: "ok"; analysis: RepoAnalysis }
  | { status: "no_api_key" }
  | { status: "error"; message: string };

export const analyzeRepo = createServerFn({ method: "POST" })
  .validator(inputSchema)
  .handler(async ({ data }): Promise<AnalyzeRepoResult> => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return { status: "no_api_key" };

    try {
      const files = await fetchFileContents(data.owner, data.name, data.branch, data.paths);
      if (files.length === 0) {
        return { status: "error", message: "Could not download any files from the repository" };
      }

      const analysis = await generateAnalysis(apiKey, {
        owner: data.owner,
        name: data.name,
        description: data.description,
        structure: data.structure,
        files,
      });
      return { status: "ok", analysis };
    } catch (err) {
      console.error("analyzeRepo failed:", err);
      const message = err instanceof Error ? err.message : "Analysis failed";
      return { status: "error", message };
    }
  });
