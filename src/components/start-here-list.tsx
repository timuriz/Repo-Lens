import type { AnalysisStartStep } from "@/types/analysis";
import { normalizeStartHere } from "@/lib/start-here";
import { FileRef } from "@/components/file-ref";

interface Props {
  steps: AnalysisStartStep[];
  onFileSelect?: (path: string) => void;
  compact?: boolean;
}

export function StartHereList({ steps, onFileSelect, compact }: Props) {
  const groups = normalizeStartHere(steps);

  if (groups.length === 0) {
    return <p className="text-sm text-muted-foreground">No reading path generated yet.</p>;
  }

  return (
    <ol className={compact ? "space-y-2" : "space-y-3"}>
      {groups.map((g) => (
        <li key={`${g.step}-${g.paths.join(",")}`} className={compact ? "" : "text-sm"}>
          <div className="flex items-start gap-2">
            <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-medium text-primary">
              {g.step}
            </span>
            <div className="min-w-0 flex-1">
              {g.type === "docs" && g.paths.length > 1 ? (
                <>
                  <p className="text-sm font-medium text-foreground">{g.label}</p>
                  {g.reason && <p className="text-xs text-muted-foreground">{g.reason}</p>}
                  <ul className="mt-1 space-y-0.5 pl-1">
                    {g.paths.map((p) => (
                      <li key={p}>
                        <FileRef path={p} onSelect={onFileSelect} />
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <>
                  <div className="flex flex-wrap items-center gap-1">
                    <FileRef path={g.paths[0]} onSelect={onFileSelect} />
                  </div>
                  {g.reason && <p className="mt-0.5 text-xs text-muted-foreground">{g.reason}</p>}
                </>
              )}
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}
