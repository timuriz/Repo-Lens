export interface AnalysisEntryPoint {
  path: string;
  role: string;
  reason: string;
}

export interface AnalysisModule {
  name: string;
  purpose: string;
  files: string[];
}

export interface AnalysisStartStep {
  step: number;
  path: string;
  reason: string;
}

export type RiskSeverity = "informational" | "low" | "medium" | "high";
export type RiskKind = "confirmed" | "inferred";
export type RiskConfidence = "low" | "medium" | "high";

/** What area of the project a finding affects. */
export type RiskCategory =
  | "security"
  | "reliability"
  | "cost"
  | "performance"
  | "maintainability"
  | "ux";

/** How bad the outcome is if the failure scenario happens. */
export type RiskImpact = "minor" | "moderate" | "major";

/** How likely the failure scenario is to actually occur. */
export type RiskLikelihood = "unlikely" | "plausible" | "likely";

/** Who is affected when the failure scenario happens. */
export type RiskScope = "local" | "multi-user" | "service-wide";

/**
 * A calibrated finding. `severity`, `kind`, `confidence`, and `rationale` are
 * derived deterministically from the model's factors and evidence provenance —
 * the model never assigns them directly.
 */
export interface AnalysisRisk {
  severity: RiskSeverity;
  category: RiskCategory;
  kind: RiskKind;
  confidence: RiskConfidence;
  impact: RiskImpact;
  likelihood: RiskLikelihood;
  scope: RiskScope;
  path: string;
  issue: string;
  recommendation: string;
  scenario: string;
  preconditions: string;
  evidence: string;
  rationale: string;
}

/** Graph edge between modules — feeds the React Flow map in a later phase. */
export interface AnalysisEdge {
  from: string;
  to: string;
  label: string;
}

export type TaskDifficulty = "easy" | "medium";

/** AI-suggested first contribution, grounded in analyzed files. */
export interface AnalysisTask {
  title: string;
  difficulty: TaskDifficulty;
  paths: string[];
  why: string;
  evidence: string;
}

export interface RepoAnalysis {
  summary: string;
  architecture: string;
  entryPoints: AnalysisEntryPoint[];
  modules: AnalysisModule[];
  startHere: AnalysisStartStep[];
  risks: AnalysisRisk[];
  edges: AnalysisEdge[];
  goodFirstTasks: AnalysisTask[];
}

export interface StartHereGroup {
  type: "docs" | "code";
  step: number;
  label: string;
  paths: string[];
  reason?: string;
}
