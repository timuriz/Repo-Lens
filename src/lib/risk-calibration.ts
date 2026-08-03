import type {
  AnalysisRisk,
  RiskCategory,
  RiskConfidence,
  RiskImpact,
  RiskKind,
  RiskLikelihood,
  RiskScope,
  RiskSeverity,
} from "@/types/analysis";

// Canonical value sets — reused by the Gemini response schema so the model
// contract and the calibration logic can never drift apart.
export const RISK_CATEGORIES = [
  "security",
  "reliability",
  "cost",
  "performance",
  "maintainability",
  "ux",
] as const satisfies readonly RiskCategory[];

export const RISK_IMPACTS = ["minor", "moderate", "major"] as const satisfies readonly RiskImpact[];

export const RISK_LIKELIHOODS = [
  "unlikely",
  "plausible",
  "likely",
] as const satisfies readonly RiskLikelihood[];

export const RISK_SCOPES = [
  "local",
  "multi-user",
  "service-wide",
] as const satisfies readonly RiskScope[];

/**
 * The raw finding the model emits. It describes an observation and its factors
 * but never assigns a final priority, kind, or confidence — those are derived.
 */
export interface RawRiskFinding {
  category: RiskCategory;
  path: string;
  issue: string;
  recommendation: string;
  scenario: string;
  preconditions: string;
  evidence: string;
  impact: RiskImpact;
  likelihood: RiskLikelihood;
  scope: RiskScope;
}

// Base severity matrix. Impact answers "how bad", likelihood answers "how
// probable". `high` requires major impact and a plausible-or-likely scenario;
// a minor, unlikely observation is only informational.
const SEVERITY_MATRIX: Record<RiskImpact, Record<RiskLikelihood, RiskSeverity>> = {
  minor: { unlikely: "informational", plausible: "low", likely: "low" },
  moderate: { unlikely: "low", plausible: "medium", likely: "medium" },
  major: { unlikely: "medium", plausible: "high", likely: "high" },
};

const SCOPE_LABEL: Record<RiskScope, string> = {
  local: "local scope",
  "multi-user": "multi-user scope",
  "service-wide": "service-wide scope",
};

const DOC_EXTENSIONS = /\.(md|mdx|markdown|txt|rst|adoc)$/i;

function isDocPath(path: string): boolean {
  return DOC_EXTENSIONS.test(path);
}

/** Collapse whitespace and lowercase so quote matching survives reformatting. */
function normalize(text: string): string {
  return text.replace(/\s+/g, " ").trim().toLowerCase();
}

export function deriveSeverity(impact: RiskImpact, likelihood: RiskLikelihood): RiskSeverity {
  return SEVERITY_MATRIX[impact][likelihood];
}

export function buildRationale(
  impact: RiskImpact,
  likelihood: RiskLikelihood,
  scope: RiskScope,
  severity: RiskSeverity,
): string {
  return `${impact} impact with ${likelihood} likelihood at ${SCOPE_LABEL[scope]} → ${severity}.`;
}

/**
 * Turn one raw finding into a calibrated risk, or drop it. A finding is dropped
 * when it cannot be trusted or is generic advice:
 *  - the cited path was never analyzed,
 *  - the evidence is not an exact excerpt of that file (hallucinated quote), or
 *  - it has no concrete failure scenario (generic best-practice noise).
 *
 * `kind` and `confidence` come from where the evidence lives — code observations
 * are confirmed/high, documentation citations are inferred/medium — so severity
 * (impact × likelihood) and confidence stay independent.
 */
export function calibrateFinding(
  finding: RawRiskFinding,
  sources: Map<string, string>,
): AnalysisRisk | null {
  const content = sources.get(finding.path);
  if (content === undefined) return null;
  if (!finding.evidence.trim()) return null;
  if (!finding.scenario.trim()) return null;

  if (!normalize(content).includes(normalize(finding.evidence))) return null;

  const isDoc = isDocPath(finding.path);
  const kind: RiskKind = isDoc ? "inferred" : "confirmed";
  const confidence: RiskConfidence = isDoc ? "medium" : "high";
  const severity = deriveSeverity(finding.impact, finding.likelihood);

  return {
    severity,
    category: finding.category,
    kind,
    confidence,
    impact: finding.impact,
    likelihood: finding.likelihood,
    scope: finding.scope,
    path: finding.path,
    issue: finding.issue,
    recommendation: finding.recommendation,
    scenario: finding.scenario,
    preconditions: finding.preconditions,
    evidence: finding.evidence,
    rationale: buildRationale(finding.impact, finding.likelihood, finding.scope, severity),
  };
}

/** Calibrate a batch of findings, dropping any that fail grounding. */
export function calibrateRisks(
  findings: RawRiskFinding[],
  sources: Map<string, string>,
): AnalysisRisk[] {
  return findings
    .map((finding) => calibrateFinding(finding, sources))
    .filter((risk): risk is AnalysisRisk => risk !== null);
}
