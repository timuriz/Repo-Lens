import { ShieldAlert, ShieldCheck } from "lucide-react";

import type { AnalysisRisk, RiskConfidence, RiskKind, RiskSeverity } from "@/types/analysis";
import { FileRef } from "@/components/file-ref";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Props {
  risks: AnalysisRisk[];
  onFileSelect?: (path: string) => void;
}

const SEVERITY_ORDER: RiskSeverity[] = ["high", "medium", "low"];

const SEVERITY_LABEL: Record<RiskSeverity, string> = {
  high: "High",
  medium: "Medium",
  low: "Low",
};

const CONFIDENCE_LABEL: Record<RiskConfidence, string> = {
  high: "High",
  medium: "Medium",
  low: "Low",
};

const SEVERITY_BADGE: Record<RiskSeverity, string> = {
  high: "bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/30",
  medium: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
  low: "bg-muted text-muted-foreground border-border",
};

const SEVERITY_CARD: Record<RiskSeverity, string> = {
  high: "border-red-500/25",
  medium: "border-amber-500/25",
  low: "border-border",
};

const KIND_SECTIONS: { kind: RiskKind; title: string; muted?: boolean }[] = [
  { kind: "confirmed", title: "Confirmed issues" },
  { kind: "inferred", title: "Inferred risks", muted: true },
];

import { sortRisksBySeverity } from "@/lib/risk-utils";({ risks, onFileSelect }: Props) {
  if (risks.length === 0) {
    return (
      <div className="flex items-center gap-2.5 rounded-lg border border-emerald-500/25 bg-emerald-500/5 px-3 py-3">
        <ShieldCheck className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
        <p className="text-sm text-foreground/90">
          No issues found in the analyzed files. Nice and clean.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <ShieldAlert className="size-4 text-primary" />
        <p className="text-sm font-semibold">
          AI found {risks.length} potential issue{risks.length === 1 ? "" : "s"}
        </p>
      </div>

      {KIND_SECTIONS.map(({ kind, title, muted }) => {
        const group = sortRisksBySeverity(risks.filter((r) => r.kind === kind));
        if (group.length === 0) return null;
        return (
          <div key={kind} className={cn("space-y-3", muted && "opacity-90")}>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {title}
            </h4>
            {SEVERITY_ORDER.map((severity) => {
              const sub = group.filter((r) => r.severity === severity);
              if (sub.length === 0) return null;
              return (
                <div key={severity} className="space-y-2">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/80">
                    {SEVERITY_LABEL[severity]}
                  </p>
                  {sub.map((risk, i) => (
                    <RiskCard key={`${risk.path}-${i}`} risk={risk} onFileSelect={onFileSelect} />
                  ))}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

export function RiskCard({
  risk,
  onFileSelect,
}: {
  risk: AnalysisRisk;
  onFileSelect?: (path: string) => void;
}) {
  return (
    <div className={cn("rounded-md border bg-card p-2.5", SEVERITY_CARD[risk.severity])}>
      <div className="flex flex-wrap items-center gap-2">
        <Badge
          variant="outline"
          className={cn(
            "shrink-0 text-[10px] font-medium uppercase tracking-wide",
            SEVERITY_BADGE[risk.severity],
          )}
        >
          {SEVERITY_LABEL[risk.severity]}
        </Badge>
        <FileRef path={risk.path} onSelect={onFileSelect} />
      </div>
      <p className="mt-1.5 text-sm text-foreground/90">{risk.issue}</p>
      <p className="mt-1 text-xs text-muted-foreground">
        <span className="font-medium text-foreground/70">Fix:</span> {risk.recommendation}
      </p>
      <div className="mt-2 space-y-0.5 border-t border-border/50 pt-2">
        <p className="text-[10px] text-muted-foreground">
          Source: {risk.path} · Confidence: {CONFIDENCE_LABEL[risk.confidence]}
        </p>
        <p className="text-xs italic text-muted-foreground/90">Evidence: {risk.evidence}</p>
      </div>
    </div>
  );
}
