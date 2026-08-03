import { describe, expect, it } from "vitest";

import type { RiskImpact, RiskLikelihood, RiskSeverity } from "@/types/analysis";
import {
  buildRationale,
  calibrateFinding,
  calibrateRisks,
  deriveSeverity,
  type RawRiskFinding,
} from "./risk-calibration";

function finding(overrides: Partial<RawRiskFinding> = {}): RawRiskFinding {
  return {
    category: "reliability",
    path: "src/app.ts",
    issue: "Something is off.",
    recommendation: "Fix it.",
    scenario: "The server crashes on malformed input.",
    preconditions: "In production with untrusted input.",
    evidence: "const x = 1;",
    impact: "moderate",
    likelihood: "plausible",
    scope: "multi-user",
    ...overrides,
  };
}

function sourcesWith(content: string, path = "src/app.ts"): Map<string, string> {
  return new Map([[path, content]]);
}

describe("deriveSeverity matrix", () => {
  const cases: [RiskImpact, RiskLikelihood, RiskSeverity][] = [
    ["minor", "unlikely", "informational"],
    ["minor", "plausible", "low"],
    ["minor", "likely", "low"],
    ["moderate", "unlikely", "low"],
    ["moderate", "plausible", "medium"],
    ["moderate", "likely", "medium"],
    ["major", "unlikely", "medium"],
    ["major", "plausible", "high"],
    ["major", "likely", "high"],
  ];

  it.each(cases)("%s impact × %s likelihood → %s", (impact, likelihood, expected) => {
    expect(deriveSeverity(impact, likelihood)).toBe(expected);
  });
});

describe("calibrateFinding grounding", () => {
  it("keeps a code finding grounded in its file as confirmed/high", () => {
    const risk = calibrateFinding(
      finding({ evidence: "const x = 1;" }),
      sourcesWith("export const x = 1;\n"),
    );
    expect(risk).not.toBeNull();
    expect(risk?.kind).toBe("confirmed");
    expect(risk?.confidence).toBe("high");
    expect(risk?.severity).toBe("medium");
  });

  it("treats a documentation citation as inferred/medium", () => {
    const risk = calibrateFinding(
      finding({
        path: "README.md",
        evidence: "AI reads a selected subset of important files",
      }),
      sourcesWith("AI reads a selected subset of important files (~25).", "README.md"),
    );
    expect(risk?.kind).toBe("inferred");
    expect(risk?.confidence).toBe("medium");
  });

  it("matches evidence despite whitespace and case reformatting", () => {
    const risk = calibrateFinding(
      finding({ evidence: "CONST   x = 1;" }),
      sourcesWith("const x = 1;"),
    );
    expect(risk).not.toBeNull();
  });

  it("rejects a finding whose path was never analyzed", () => {
    expect(calibrateFinding(finding({ path: "ghost.ts" }), sourcesWith("const x = 1;"))).toBeNull();
  });

  it("rejects a hallucinated quote not present in the file", () => {
    expect(
      calibrateFinding(finding({ evidence: "eval(userInput)" }), sourcesWith("const x = 1;")),
    ).toBeNull();
  });

  it("rejects generic advice with no concrete failure scenario", () => {
    expect(
      calibrateFinding(
        finding({ scenario: "   ", evidence: "const x = 1;" }),
        sourcesWith("const x = 1;"),
      ),
    ).toBeNull();
  });

  it("rejects a finding with empty evidence", () => {
    expect(calibrateFinding(finding({ evidence: "" }), sourcesWith("const x = 1;"))).toBeNull();
  });

  it("produces a stable, human-readable rationale", () => {
    const risk = calibrateFinding(
      finding({ impact: "major", likelihood: "likely", scope: "service-wide" }),
      sourcesWith("const x = 1;"),
    );
    expect(risk?.rationale).toBe(
      "major impact with likely likelihood at service-wide scope → high.",
    );
    expect(risk?.rationale).toBe(buildRationale("major", "likely", "service-wide", "high"));
  });
});

describe("calibrateRisks batch", () => {
  it("drops ungrounded findings and keeps valid ones", () => {
    const sources = sourcesWith("const x = 1;");
    const risks = calibrateRisks(
      [finding({ evidence: "const x = 1;" }), finding({ path: "ghost.ts" })],
      sources,
    );
    expect(risks).toHaveLength(1);
    expect(risks[0]?.path).toBe("src/app.ts");
  });
});

// Regression fixtures: the six findings from the original over-eager report.
// Calibration must stop them from being uniformly labelled high-severity risks.
describe("regression: report calibration", () => {
  it("demo IP rate limit is not high without a production/abuse precondition", () => {
    const risk = calibrateFinding(
      finding({
        category: "cost",
        path: "src/lib/api/repo.functions.ts",
        issue: "Demo rate limit is IP-based and easy to bypass.",
        scenario: "A determined abuser rotates IPs to exceed the intended quota.",
        preconditions: "Only matters in a public production deployment with abuse.",
        evidence: "You've hit the demo limit",
        impact: "moderate",
        likelihood: "unlikely",
        scope: "service-wide",
      }),
      sourcesWith(
        "message: `You've hit the demo limit (${RATE_LIMIT_MAX}/hour).`",
        "src/lib/api/repo.functions.ts",
      ),
    );
    expect(risk?.severity).toBe("low");
    expect(risk?.severity).not.toBe("high");
  });

  it("limited Shiki languages is informational, not a risk", () => {
    const risk = calibrateFinding(
      finding({
        category: "ux",
        path: "src/components/code-block.tsx",
        issue: "Unsupported languages fall back to plaintext.",
        scenario: "A file in an unlisted language renders without syntax colors.",
        preconditions: "Only when previewing a language outside the supported set.",
        evidence: "const SUPPORTED_LANGS",
        impact: "minor",
        likelihood: "unlikely",
        scope: "local",
      }),
      sourcesWith("const SUPPORTED_LANGS = [", "src/components/code-block.tsx"),
    );
    expect(risk?.severity).toBe("informational");
  });

  it("partial file analysis stays medium and keeps its conditional context", () => {
    const risk = calibrateFinding(
      finding({
        category: "reliability",
        path: "README.md",
        issue: "Only ~25 files are analyzed.",
        scenario: "A large monorepo yields incomplete insights.",
        preconditions: "Only affects repositories larger than the file budget.",
        evidence: "AI reads a selected subset of important files (~25)",
        impact: "moderate",
        likelihood: "likely",
        scope: "multi-user",
      }),
      sourcesWith(
        "AI reads a selected subset of important files (~25), not every file",
        "README.md",
      ),
    );
    expect(risk?.severity).toBe("medium");
    expect(risk?.kind).toBe("inferred");
    expect(risk?.preconditions).toContain("larger than the file budget");
  });
});
