export interface AnalysisEntryPoint {
  path: string;
  why: string;
}

export interface AnalysisModule {
  name: string;
  purpose: string;
  files: string[];
  risks: string[];
}

export interface AnalysisStartStep {
  step: number;
  path: string;
  reason: string;
}

/** Graph edge between modules — feeds the React Flow map in a later phase. */
export interface AnalysisEdge {
  from: string;
  to: string;
  label: string;
}

export interface RepoAnalysis {
  summary: string;
  architecture: string;
  entryPoints: AnalysisEntryPoint[];
  modules: AnalysisModule[];
  startHere: AnalysisStartStep[];
  edges: AnalysisEdge[];
}
