import { describe, expect, it } from "vitest";

import type { AnalysisRisk } from "@/types/analysis";
import { formatRisksForClipboard } from "./format-risks";

const risks: AnalysisRisk[] = [
  {
    severity: "medium",
    category: "reliability",
    kind: "inferred",
    confidence: "medium",
    impact: "moderate",
    likelihood: "plausible",
    scope: "multi-user",
    path: "README.md",
    issue: "Deployment readiness is unclear.",
    recommendation: "Document the production deployment flow.",
    scenario: "A new operator cannot ship the app to production.",
    preconditions: "Only when deploying beyond local development.",
    evidence: "The README only documents local development.",
    rationale: "moderate impact with plausible likelihood at multi-user scope → medium.",
  },
  {
    severity: "high",
    category: "security",
    kind: "confirmed",
    confidence: "high",
    impact: "major",
    likelihood: "likely",
    scope: "service-wide",
    path: "src/api.ts",
    issue: "The API URL is hardcoded.",
    recommendation: "Read the URL from environment configuration.",
    scenario: "Production traffic is sent to a localhost endpoint.",
    preconditions: "In any non-local deployment.",
    evidence: "The file contains http://localhost:3000.",
    rationale: "major impact with likely likelihood at service-wide scope → high.",
  },
];

describe("formatRisksForClipboard", () => {
  it("formats findings as shareable Markdown grouped by severity", () => {
    expect(formatRisksForClipboard(risks)).toBe(`# RepoLens risk report

2 findings · 1 high · 1 medium

## High

### [HIGH] security · src/api.ts
**Issue:** The API URL is hardcoded.
**Failure scenario:** Production traffic is sent to a localhost endpoint.
**Applies when:** In any non-local deployment.
**Fix:** Read the URL from environment configuration.
**Factors:** major impact · likely likelihood · service-wide scope
**Why this priority:** major impact with likely likelihood at service-wide scope → high.
**Confidence:** High (confirmed)
**Evidence:** The file contains http://localhost:3000.

## Medium

### [MEDIUM] reliability · README.md
**Issue:** Deployment readiness is unclear.
**Failure scenario:** A new operator cannot ship the app to production.
**Applies when:** Only when deploying beyond local development.
**Fix:** Document the production deployment flow.
**Factors:** moderate impact · plausible likelihood · multi-user scope
**Why this priority:** moderate impact with plausible likelihood at multi-user scope → medium.
**Confidence:** Medium (inferred)
**Evidence:** The README only documents local development.`);
  });

  it("returns a useful report when the current view has no findings", () => {
    expect(formatRisksForClipboard([])).toBe(
      "# RepoLens risk report\n\nNo findings in the current view.",
    );
  });
});
