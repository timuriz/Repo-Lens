import { describe, expect, it } from "vitest";

import type { AnalysisRisk, RiskCategory, RiskSeverity } from "@/types/analysis";
import { countBySeverity, filterRisks, sortRisksBySeverity } from "./risk-utils";

function risk(overrides: Partial<AnalysisRisk> = {}): AnalysisRisk {
  return {
    severity: "medium",
    category: "reliability",
    kind: "confirmed",
    confidence: "high",
    impact: "moderate",
    likelihood: "plausible",
    scope: "multi-user",
    path: "src/app.ts",
    issue: "issue",
    recommendation: "fix",
    scenario: "it breaks",
    preconditions: "in production",
    evidence: "const x = 1;",
    rationale: "moderate impact with plausible likelihood at multi-user scope → medium.",
    ...overrides,
  };
}

describe("sortRisksBySeverity", () => {
  it("orders high → medium → low → informational", () => {
    const severities: RiskSeverity[] = ["informational", "high", "low", "medium"];
    const sorted = sortRisksBySeverity(severities.map((severity) => risk({ severity })));
    expect(sorted.map((r) => r.severity)).toEqual(["high", "medium", "low", "informational"]);
  });
});

describe("filterRisks", () => {
  const risks = [
    risk({ severity: "high", category: "security", kind: "confirmed", confidence: "high" }),
    risk({ severity: "low", category: "ux", kind: "inferred", confidence: "medium" }),
    risk({ severity: "high", category: "cost", kind: "inferred", confidence: "medium" }),
  ];

  it("returns everything when no dimension is active", () => {
    expect(filterRisks(risks, {})).toHaveLength(3);
    expect(filterRisks(risks, { severities: new Set() })).toHaveLength(3);
  });

  it("filters by a single dimension", () => {
    const high = filterRisks(risks, { severities: new Set<RiskSeverity>(["high"]) });
    expect(high).toHaveLength(2);
  });

  it("combines dimensions with AND", () => {
    const result = filterRisks(risks, {
      severities: new Set<RiskSeverity>(["high"]),
      categories: new Set<RiskCategory>(["security"]),
    });
    expect(result).toHaveLength(1);
    expect(result[0]?.category).toBe("security");
  });

  it("returns an empty array when nothing matches", () => {
    const result = filterRisks(risks, { categories: new Set<RiskCategory>(["performance"]) });
    expect(result).toEqual([]);
  });
});

describe("countBySeverity", () => {
  it("counts each level and reports zeros", () => {
    const counts = countBySeverity([
      risk({ severity: "high" }),
      risk({ severity: "high" }),
      risk({ severity: "informational" }),
    ]);
    expect(counts).toEqual({ high: 2, medium: 0, low: 0, informational: 1 });
  });
});
