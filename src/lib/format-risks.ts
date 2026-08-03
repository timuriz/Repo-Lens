import type { AnalysisRisk, RiskConfidence, RiskSeverity } from "@/types/analysis";
import { SEVERITY_ORDER, countBySeverity, sortRisksBySeverity } from "@/lib/risk-utils";

const SEVERITY_LABEL: Record<RiskSeverity, string> = {
  high: "High",
  medium: "Medium",
  low: "Low",
  informational: "Informational",
};

const CONFIDENCE_LABEL: Record<RiskConfidence, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

function formatRisk(risk: AnalysisRisk): string {
  const lines = [
    `### [${SEVERITY_LABEL[risk.severity].toUpperCase()}] ${risk.category} · ${risk.path}`,
    `**Issue:** ${risk.issue}`,
    `**Failure scenario:** ${risk.scenario}`,
  ];
  if (risk.preconditions.trim()) lines.push(`**Applies when:** ${risk.preconditions}`);
  lines.push(
    `**Fix:** ${risk.recommendation}`,
    `**Factors:** ${risk.impact} impact · ${risk.likelihood} likelihood · ${risk.scope} scope`,
    `**Why this priority:** ${risk.rationale}`,
    `**Confidence:** ${CONFIDENCE_LABEL[risk.confidence]} (${risk.kind})`,
    `**Evidence:** ${risk.evidence}`,
  );
  return lines.join("\n");
}

/** Render the given (already-filtered) findings as a shareable Markdown report. */
export function formatRisksForClipboard(risks: AnalysisRisk[]): string {
  const title = "# RepoPrism risk report";
  if (risks.length === 0) {
    return `${title}\n\nNo findings in the current view.`;
  }

  const counts = countBySeverity(risks);
  const breakdown = SEVERITY_ORDER.filter((severity) => counts[severity] > 0)
    .map((severity) => `${counts[severity]} ${severity}`)
    .join(" · ");
  const summary = `${risks.length} finding${risks.length === 1 ? "" : "s"} · ${breakdown}`;

  const sections = SEVERITY_ORDER.flatMap((severity) => {
    const group = sortRisksBySeverity(risks.filter((risk) => risk.severity === severity));
    if (group.length === 0) return [];
    return [`## ${SEVERITY_LABEL[severity]}\n\n${group.map(formatRisk).join("\n\n")}`];
  });

  return [title, summary, ...sections].join("\n\n");
}
