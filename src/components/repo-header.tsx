import { GitBranch, Star, ExternalLink } from "lucide-react";
import type { RepoMeta } from "@/types/repo";
import { Badge } from "@/components/ui/badge";

interface Props {
  meta: RepoMeta;
  fileCount: number;
  truncated: boolean;
}

export function RepoHeader({ meta, fileCount, truncated }: Props) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <a
            href={meta.url}
            target="_blank"
            rel="noreferrer"
            className="group inline-flex items-center gap-1.5 text-lg font-semibold text-foreground hover:text-primary"
          >
            <span className="text-muted-foreground">{meta.owner}/</span>
            <span>{meta.name}</span>
            <ExternalLink className="size-3.5 opacity-0 transition-opacity group-hover:opacity-100" />
          </a>
          {meta.description && (
            <p className="mt-1 text-sm text-muted-foreground">{meta.description}</p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="gap-1">
            <Star className="size-3" />
            {meta.stars.toLocaleString()}
          </Badge>
          <Badge variant="secondary" className="gap-1">
            <GitBranch className="size-3" />
            {meta.defaultBranch}
          </Badge>
          <Badge variant="outline">
            {fileCount.toLocaleString()} files{truncated ? " (truncated)" : ""}
          </Badge>
        </div>
      </div>
    </div>
  );
}
