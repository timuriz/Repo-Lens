import type { AnalysisRisk, RiskKind } from "@/types/analysis";
import { sortRisksBySeverity } from "@/lib/risk-utils";

const SECTION_LABEL: Record<RiskKind, string> = {
  confirmed: "Confirmed issues",
  inferred: "Inferred risks",
};

const CONFIDENCE_LABEL: Record<AnalysisRisk["confidence"], string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

function formatRisk(risk: AnalysisRisk): string {
  return [
    `### [${risk.severity.toUpperCase()}] ${risk.path}`,
    `**Issue:** ${risk.issue}`,
    `**Fix:** ${risk.recommendation}`,
    `**Confidence:** ${CONFIDENCE_LABEL[risk.confidence]}`,
    `**Evidence:** ${risk.evidence}`,
  ].join("\n");
}

export function formatRisksForClipboard(risks: AnalysisRisk[]): string {
  const title = "# RepoLens risk report";
  if (risks.length === 0) {
    return `${title}\n\nNo potential issues found in the analyzed files.`;
  }

  const confirmedCount = risks.filter((risk) => risk.kind === "confirmed").length;
  const inferredCount = risks.length - confirmedCount;
  const summary = `${risks.length} potential issue${risks.length === 1 ? "" : "s"} · ${confirmedCount} confirmed · ${inferredCount} inferred`;

  const sections = (["confirmed", "inferred"] as const).flatMap((kind) => {
    const group = sortRisksBySeverity(risks.filter((risk) => risk.kind === kind));
    if (group.length === 0) return [];
    return [`## ${SECTION_LABEL[kind]}\n\n${group.map(formatRisk).join("\n\n")}`];
  });

  return [title, summary, ...sections].join("\n\n");
}
