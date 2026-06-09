import type { AnalysisRisk, RiskSeverity } from "@/types/analysis";

const SEVERITY_ORDER: RiskSeverity[] = ["high", "medium", "low"];

export function sortRisksBySeverity(risks: AnalysisRisk[]): AnalysisRisk[] {
  return [...risks].sort(
    (a, b) => SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity),
  );
}
