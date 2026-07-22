import type { FileRole, RepoFile } from "@/types/repo";
import { pickHeuristicStartHere } from "@/lib/heuristic-start-here";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Props {
  files: RepoFile[];
  /** While AI is generating — show a quieter preview, not a full ranked list. */
  loading?: boolean;
  onFileSelect?: (path: string) => void;
}

const ROLE_LABEL: Record<FileRole, string> = {
  overview: "Overview",
  entrypoint: "Entrypoint",
  api: "API",
  model: "Model",
  ui: "UI",
  config: "Config",
  docs: "Docs",
  other: "File",
};

const ROLE_CLASS: Record<FileRole, string> = {
  overview: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
  entrypoint: "bg-primary/15 text-primary border-primary/30",
  api: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
  model: "bg-violet-500/15 text-violet-700 dark:text-violet-300 border-violet-500/30",
  ui: "bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30",
  config: "bg-muted text-muted-foreground border-border",
  docs: "bg-muted text-muted-foreground border-border",
  other: "bg-muted text-muted-foreground border-border",
};

export function ImportantFiles({ files, loading, onFileSelect }: Props) {
  if (loading) {
    return (
      <div className="space-y-3">
        <p className="text-xs text-muted-foreground">
          Building an AI reading path… showing a quick preview meanwhile.
        </p>
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-14 animate-pulse rounded-md border bg-muted/40" />
          ))}
        </div>
      </div>
    );
  }

  const top = pickHeuristicStartHere(files);

  if (top.length === 0) {
    return <p className="text-sm text-muted-foreground">No files to rank yet.</p>;
  }

  return (
    <ol className="space-y-2">
      {top.map((f, i) => {
        const name = f.path.split("/").pop();
        const dir = f.path.slice(0, f.path.length - (name?.length ?? 0));
        return (
          <li key={f.path}>
            <button
              type="button"
              onClick={() => onFileSelect?.(f.path)}
              className="w-full rounded-md border bg-card p-2.5 text-left transition-colors hover:bg-accent/50"
            >
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium text-foreground" title={f.path}>
                      {name}
                    </p>
                    <Badge
                      variant="outline"
                      className={cn(
                        "shrink-0 text-[10px] font-medium uppercase tracking-wide",
                        ROLE_CLASS[f.role],
                      )}
                    >
                      {ROLE_LABEL[f.role]}
                    </Badge>
                  </div>
                  {dir && (
                    <p className="truncate text-xs text-muted-foreground" title={dir}>
                      {dir}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-muted-foreground">{f.reason}</p>
                </div>
              </div>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
