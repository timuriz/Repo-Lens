import { useMemo, useState } from "react";
import { Check, ChevronDown, Clipboard, ShieldAlert, ShieldCheck, X } from "lucide-react";
import { toast } from "sonner";

import type { AnalysisRisk, RiskCategory, RiskConfidence, RiskSeverity } from "@/types/analysis";
import { formatRisksForClipboard } from "@/lib/format-risks";
import { SEVERITY_ORDER, filterRisks, sortRisksBySeverity } from "@/lib/risk-utils";
import { FileRef } from "@/components/file-ref";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Props {
  risks: AnalysisRisk[];
  onFileSelect?: (path: string) => void;
}

const SEVERITY_LABEL: Record<RiskSeverity, string> = {
  high: "High",
  medium: "Medium",
  low: "Low",
  informational: "Info",
};

const CONFIDENCE_LABEL: Record<RiskConfidence, string> = {
  high: "High",
  medium: "Medium",
  low: "Low",
};

const CATEGORY_LABEL: Record<RiskCategory, string> = {
  security: "Security",
  reliability: "Reliability",
  cost: "Cost",
  performance: "Performance",
  maintainability: "Maintainability",
  ux: "UX",
};

const SEVERITY_BADGE: Record<RiskSeverity, string> = {
  high: "bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/30",
  medium: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
  low: "bg-muted text-muted-foreground border-border",
  informational: "bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/25",
};

const SEVERITY_CARD: Record<RiskSeverity, string> = {
  high: "border-red-500/25",
  medium: "border-amber-500/25",
  low: "border-border",
  informational: "border-sky-500/20",
};

/** Toggle a value in an immutable set, returning a new set. */
function toggle<T>(set: Set<T>, value: T): Set<T> {
  const next = new Set(set);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  return next;
}

export function AiRisksPanel({ risks, onFileSelect }: Props) {
  const [copied, setCopied] = useState(false);
  const [severities, setSeverities] = useState<Set<RiskSeverity>>(new Set());
  const [categories, setCategories] = useState<Set<RiskCategory>>(new Set());

  const presentSeverities = useMemo(
    () => SEVERITY_ORDER.filter((s) => risks.some((r) => r.severity === s)),
    [risks],
  );
  const presentCategories = useMemo(
    () =>
      (Object.keys(CATEGORY_LABEL) as RiskCategory[]).filter((c) =>
        risks.some((r) => r.category === c),
      ),
    [risks],
  );

  const visible = useMemo(
    () => sortRisksBySeverity(filterRisks(risks, { severities, categories })),
    [risks, severities, categories],
  );

  const hasFilters = severities.size > 0 || categories.size > 0;

  function resetFilters() {
    setSeverities(new Set());
    setCategories(new Set());
  }

  async function copyRisks() {
    try {
      await navigator.clipboard.writeText(formatRisksForClipboard(visible));
      setCopied(true);
      toast.success("Risk report copied");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Couldn't copy risk report");
    }
  }

  if (risks.length === 0) {
    return (
      <div className="flex items-center gap-2.5 rounded-lg border border-emerald-500/25 bg-emerald-500/5 px-3 py-3">
        <ShieldCheck className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
        <p className="text-sm text-foreground/90">
          No findings in the analyzed files. Nice and clean.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <ShieldAlert className="size-4 text-primary" />
          <p className="text-sm font-semibold">
            Showing {visible.length} of {risks.length} finding{risks.length === 1 ? "" : "s"}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-7 gap-1.5 px-2"
          onClick={copyRisks}
          disabled={visible.length === 0}
        >
          {copied ? <Check /> : <Clipboard />}
          {copied ? "Copied" : "Copy view"}
        </Button>
      </div>

      <div className="space-y-2 rounded-lg border bg-muted/30 p-2.5">
        <FilterRow label="Severity">
          {presentSeverities.map((severity) => (
            <FilterChip
              key={severity}
              active={severities.has(severity)}
              onClick={() => setSeverities((s) => toggle(s, severity))}
            >
              {SEVERITY_LABEL[severity]}
            </FilterChip>
          ))}
        </FilterRow>
        <FilterRow label="Category">
          {presentCategories.map((category) => (
            <FilterChip
              key={category}
              active={categories.has(category)}
              onClick={() => setCategories((c) => toggle(c, category))}
            >
              {CATEGORY_LABEL[category]}
            </FilterChip>
          ))}
        </FilterRow>
        {hasFilters && (
          <button
            type="button"
            onClick={resetFilters}
            className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground"
          >
            <X className="size-3" />
            Clear filters
          </button>
        )}
      </div>

      {visible.length === 0 ? (
        <p className="rounded-md border border-dashed px-3 py-6 text-center text-sm text-muted-foreground">
          No findings match the current filters.
        </p>
      ) : (
        <div className="space-y-2">
          {visible.map((risk, i) => (
            <RiskCard key={`${risk.path}-${i}`} risk={risk} onFileSelect={onFileSelect} />
          ))}
        </div>
      )}
    </div>
  );
}

function FilterRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="w-16 shrink-0 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      {children}
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-2 py-0.5 text-[11px] font-medium transition-colors",
        active
          ? "border-primary bg-primary/10 text-primary"
          : "border-border bg-background text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

export function RiskCard({
  risk,
  onFileSelect,
}: {
  risk: AnalysisRisk;
  onFileSelect?: (path: string) => void;
}) {
  const [showWhy, setShowWhy] = useState(false);

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
        <Badge
          variant="outline"
          className="shrink-0 border-border text-[10px] font-medium uppercase tracking-wide text-muted-foreground"
        >
          {CATEGORY_LABEL[risk.category]}
        </Badge>
        <FileRef path={risk.path} onSelect={onFileSelect} />
      </div>
      <p className="mt-1.5 text-sm text-foreground/90">{risk.issue}</p>
      <p className="mt-1 text-xs text-muted-foreground">
        <span className="font-medium text-foreground/70">If unaddressed:</span> {risk.scenario}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        <span className="font-medium text-foreground/70">Fix:</span> {risk.recommendation}
      </p>

      <button
        type="button"
        onClick={() => setShowWhy((v) => !v)}
        className="mt-2 flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
      >
        <ChevronDown className={cn("size-3 transition-transform", showWhy && "rotate-180")} />
        Why this priority?
      </button>

      {showWhy && (
        <div className="mt-2 space-y-1 border-t border-border/50 pt-2">
          <p className="text-xs text-foreground/80">{risk.rationale}</p>
          <p className="text-[10px] text-muted-foreground">
            {risk.impact} impact · {risk.likelihood} likelihood · {risk.scope} scope
          </p>
          {risk.preconditions.trim() && (
            <p className="text-[10px] text-muted-foreground">Applies when: {risk.preconditions}</p>
          )}
          <p className="text-[10px] text-muted-foreground">
            Source: {risk.path} · Confidence: {CONFIDENCE_LABEL[risk.confidence]} ({risk.kind})
          </p>
          <p className="text-xs italic text-muted-foreground/90">Evidence: {risk.evidence}</p>
        </div>
      )}
    </div>
  );
}
