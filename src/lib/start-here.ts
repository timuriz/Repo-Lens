import type { AnalysisStartStep, StartHereGroup } from "@/types/analysis";

const DOC_PATTERN =
  /^(readme(\.(md|rst|txt))?|contributing(\.md)?|architecture(\.md)?|design(\.md)?)$/i;

function isDocPath(path: string): boolean {
  const lower = path.toLowerCase();
  const basename = lower.split("/").pop() ?? "";
  if (DOC_PATTERN.test(basename)) return true;
  if (lower.startsWith("docs/") && basename.endsWith(".md")) return true;
  if (basename.endsWith(".md") && lower.includes("/readme")) return true;
  return false;
}

/** Collapse doc spam and renumber code steps for onboarding clarity. */
export function normalizeStartHere(steps: AnalysisStartStep[]): StartHereGroup[] {
  const sorted = [...steps].sort((a, b) => a.step - b.step);
  const docSteps = sorted.filter((s) => isDocPath(s.path));
  const codeSteps = sorted.filter((s) => !isDocPath(s.path));

  const groups: StartHereGroup[] = [];
  let stepNum = 1;

  if (docSteps.length > 2) {
    groups.push({
      type: "docs",
      step: stepNum++,
      label: "Project docs",
      paths: docSteps.map((s) => s.path),
      reason: "Overview and setup documentation",
    });
  } else {
    for (const s of docSteps) {
      groups.push({
        type: "docs",
        step: stepNum++,
        label: s.path.split("/").pop() ?? s.path,
        paths: [s.path],
        reason: s.reason,
      });
    }
  }

  for (const s of codeSteps) {
    groups.push({
      type: "code",
      step: stepNum++,
      label: s.path.split("/").pop() ?? s.path,
      paths: [s.path],
      reason: s.reason,
    });
  }

  return groups;
}

/** Count displayable start-here items (groups, not raw steps). */
export function countStartHereGroups(steps: AnalysisStartStep[]): number {
  return normalizeStartHere(steps).length;
}
