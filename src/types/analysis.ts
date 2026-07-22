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

export type RiskSeverity = "low" | "medium" | "high";
export type RiskKind = "confirmed" | "inferred";
export type RiskConfidence = "low" | "medium" | "high";

export interface AnalysisRisk {
  severity: RiskSeverity;
  kind: RiskKind;
  confidence: RiskConfidence;
  path: string;
  issue: string;
  recommendation: string;
  evidence: string;
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
