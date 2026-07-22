import { GitPullRequestArrow } from "lucide-react";

import type { AnalysisTask, TaskDifficulty } from "@/types/analysis";
import { FileRef } from "@/components/file-ref";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Props {
  tasks: AnalysisTask[];
  onFileSelect?: (path: string) => void;
}

const DIFFICULTY_LABEL: Record<TaskDifficulty, string> = {
  easy: "Easy",
  medium: "Medium",
};

const DIFFICULTY_BADGE: Record<TaskDifficulty, string> = {
  easy: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
  medium: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
};

export function AiContributePanel({ tasks, onFileSelect }: Props) {
  if (tasks.length === 0) {
    return (
      <div className="flex items-center gap-2.5 rounded-lg border border-border bg-muted/30 px-3 py-3">
        <GitPullRequestArrow className="size-4 shrink-0 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          No grounded first tasks surfaced for the analyzed files.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <GitPullRequestArrow className="size-4 text-primary" />
        <p className="text-sm font-semibold">
          {tasks.length} good first task{tasks.length === 1 ? "" : "s"}
        </p>
      </div>

      <ol className="space-y-2.5">
        {tasks.map((task, i) => (
          <li key={`${task.title}-${i}`} className="rounded-md border bg-card p-2.5">
            <div className="flex items-start gap-2">
              <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary">
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-medium text-foreground/90">{task.title}</p>
                  <Badge
                    variant="outline"
                    className={cn(
                      "shrink-0 text-[10px] font-medium uppercase tracking-wide",
                      DIFFICULTY_BADGE[task.difficulty],
                    )}
                  >
                    {DIFFICULTY_LABEL[task.difficulty]}
                  </Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{task.why}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {task.paths.map((path) => (
                    <FileRef key={path} path={path} onSelect={onFileSelect} />
                  ))}
                </div>
                {task.evidence && (
                  <p className="mt-2 border-t border-border/50 pt-2 text-xs italic text-muted-foreground/90">
                    Evidence: {task.evidence}
                  </p>
                )}
              </div>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
