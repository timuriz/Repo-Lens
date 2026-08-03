import type {
  AnalysisRisk,
  RiskCategory,
  RiskConfidence,
  RiskKind,
  RiskSeverity,
} from "@/types/analysis";

/** Canonical display order, most urgent first. */
export const SEVERITY_ORDER: RiskSeverity[] = ["high", "medium", "low", "informational"];

export function sortRisksBySeverity(risks: AnalysisRisk[]): AnalysisRisk[] {
  return [...risks].sort(
    (a, b) => SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity),
  );
}

/** Active filter selections. An empty set for a dimension means "no filter". */
export interface RiskFilterCriteria {
  severities?: ReadonlySet<RiskSeverity>;
  categories?: ReadonlySet<RiskCategory>;
  kinds?: ReadonlySet<RiskKind>;
  confidences?: ReadonlySet<RiskConfidence>;
}

function matches<T>(value: T, selected?: ReadonlySet<T>): boolean {
  return !selected || selected.size === 0 || selected.has(value);
}

/** Keep risks matching every active dimension. Pure — safe for render memos. */
export function filterRisks(risks: AnalysisRisk[], criteria: RiskFilterCriteria): AnalysisRisk[] {
  return risks.filter(
    (risk) =>
      matches(risk.severity, criteria.severities) &&
      matches(risk.category, criteria.categories) &&
      matches(risk.kind, criteria.kinds) &&
      matches(risk.confidence, criteria.confidences),
  );
}

/** Count risks per severity level, including zeros, for summaries and badges. */
export function countBySeverity(risks: AnalysisRisk[]): Record<RiskSeverity, number> {
  const counts: Record<RiskSeverity, number> = {
    high: 0,
    medium: 0,
    low: 0,
    informational: 0,
  };
  for (const risk of risks) counts[risk.severity] += 1;
  return counts;
}
