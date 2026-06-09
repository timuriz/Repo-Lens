import process from "node:process";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { fetchFileContents, fetchSingleFile } from "../github.server";
import { generateAnalysis } from "../ai.server";
import { toFriendlyAiError, type FriendlyAiError } from "../ai-errors";
import type { RepoAnalysis } from "@/types/analysis";

const analyzeInputSchema = z.object({
  owner: z.string().min(1),
  name: z.string().min(1),
  branch: z.string().min(1),
  description: z.string().nullable(),
  structure: z.string().max(6_000),
  paths: z.array(z.string().min(1)).min(1).max(30),
});

const previewInputSchema = z.object({
  owner: z.string().min(1),
  name: z.string().min(1),
  branch: z.string().min(1),
  path: z.string().min(1),
});

export type AnalyzeRepoResult =
  | { status: "ok"; analysis: RepoAnalysis; sources: Record<string, string> }
  | { status: "no_api_key" }
  | { status: "error"; error: FriendlyAiError };

export type FetchFilePreviewResult =
  | { status: "ok"; content: string; truncated: boolean }
  | { status: "error"; message: string };

export const analyzeRepo = createServerFn({ method: "POST" })
  .validator(analyzeInputSchema)
  .handler(async ({ data }): Promise<AnalyzeRepoResult> => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return { status: "no_api_key" };

    try {
      const files = await fetchFileContents(data.owner, data.name, data.branch, data.paths);
      if (files.length === 0) {
        return {
          status: "error",
          error: {
            kind: "fatal",
            title: "Could not read files",
            message: "No file contents could be downloaded from this repository.",
          },
        };
      }

      const analysis = await generateAnalysis(apiKey, {
        owner: data.owner,
        name: data.name,
        description: data.description,
        structure: data.structure,
        files,
      });

      const sources: Record<string, string> = {};
      for (const f of files) sources[f.path] = f.content;

      return { status: "ok", analysis, sources };
    } catch (err) {
      console.error("analyzeRepo failed:", err);
      return { status: "error", error: toFriendlyAiError(err) };
    }
  });

export const fetchFilePreview = createServerFn({ method: "POST" })
  .validator(previewInputSchema)
  .handler(async ({ data }): Promise<FetchFilePreviewResult> => {
    try {
      const file = await fetchSingleFile(data.owner, data.name, data.branch, data.path);
      if (!file) {
        return { status: "error", message: "Could not load this file" };
      }
      return { status: "ok", content: file.content, truncated: file.truncated };
    } catch (err) {
      console.error("fetchFilePreview failed:", err);
      return {
        status: "error",
        message: err instanceof Error ? err.message : "Failed to load file",
      };
    }
  });
