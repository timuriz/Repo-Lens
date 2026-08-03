import { describe, expect, it } from "vitest";

import type { AnalysisRisk } from "@/types/analysis";
import { formatRisksForClipboard } from "./format-risks";

const risks: AnalysisRisk[] = [
  {
    severity: "medium",
    kind: "inferred",
    confidence: "medium",
    path: "README.md",
    issue: "Deployment readiness is unclear.",
    recommendation: "Document the production deployment flow.",
    evidence: "The README only documents local development.",
  },
  {
    severity: "high",
    kind: "confirmed",
    confidence: "high",
    path: "src/api.ts",
    issue: "The API URL is hardcoded.",
    recommendation: "Read the URL from environment configuration.",
    evidence: "The file contains http://localhost:3000.",
  },
];

describe("formatRisksForClipboard", () => {
  it("formats risks as shareable Markdown grouped by kind", () => {
    expect(formatRisksForClipboard(risks)).toBe(`# RepoLens risk report

2 potential issues · 1 confirmed · 1 inferred

## Confirmed issues

### [HIGH] src/api.ts
**Issue:** The API URL is hardcoded.
**Fix:** Read the URL from environment configuration.
**Confidence:** High
**Evidence:** The file contains http://localhost:3000.

## Inferred risks

### [MEDIUM] README.md
**Issue:** Deployment readiness is unclear.
**Fix:** Document the production deployment flow.
**Confidence:** Medium
**Evidence:** The README only documents local development.`);
  });

  it("returns a useful report when no risks were found", () => {
    expect(formatRisksForClipboard([])).toBe(
      "# RepoLens risk report\n\nNo potential issues found in the analyzed files.",
    );
  });
});
