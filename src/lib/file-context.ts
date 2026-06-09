import type { RepoAnalysis } from "@/types/analysis";

/** Why a file matters — from analysis cross-references. */
export function getFileContext(path: string, analysis: RepoAnalysis): string | null {
  const startStep = analysis.startHere.find((s) => s.path === path);
  if (startStep?.reason) return startStep.reason;

  const entry = analysis.entryPoints.find((e) => e.path === path);
  if (entry) return `${entry.role}: ${entry.reason}`;

  const mod = analysis.modules.find((m) => m.files.includes(path));
  if (mod) return `${mod.name}: ${mod.purpose}`;

  const risk = analysis.risks.find((r) => r.path === path);
  if (risk) return risk.issue;

  return null;
}
