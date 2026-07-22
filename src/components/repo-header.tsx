import {
  AlertTriangle,
  Check,
  GitBranch,
  GitCommitHorizontal,
  Link2,
  Star,
  ExternalLink,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { RepoMeta } from "@/types/repo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface Props {
  meta: RepoMeta;
  fileCount: number;
  truncated: boolean;
}

export function RepoHeader({ meta, fileCount, truncated }: Props) {
  const shortSha = meta.treeSha.slice(0, 7);
  const treeUrl = `${meta.url}/tree/${meta.treeSha}`;
  const [copied, setCopied] = useState(false);

  async function copyShareUrl() {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.origin);
    url.searchParams.set("repo", `${meta.owner}/${meta.name}`);
    if (meta.branch !== meta.defaultBranch) {
      url.searchParams.set("branch", meta.branch);
    }
    try {
      await navigator.clipboard.writeText(url.toString());
      setCopied(true);
      toast.success("Link copied", { description: url.toString() });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Couldn't copy link", { description: url.toString() });
    }
  }

  return (
    <div className="space-y-2">
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
            <p className="mt-2 text-xs text-muted-foreground">
              Analysis target: <span className="font-medium text-foreground/80">{meta.branch}</span>
              {" · "}
              tree{" "}
              <a
                href={treeUrl}
                target="_blank"
                rel="noreferrer"
                className="rounded bg-muted px-1 font-mono text-[11px] hover:text-primary hover:underline"
                title="View this tree on GitHub"
              >
                {shortSha}
              </a>
              {meta.branch !== meta.defaultBranch && (
                <span className="text-muted-foreground"> (default is {meta.defaultBranch})</span>
              )}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="gap-1">
              <Star className="size-3" />
              {meta.stars.toLocaleString()}
            </Badge>
            <Badge variant="secondary" className="gap-1">
              <GitBranch className="size-3" />
              {meta.branch}
            </Badge>
            <a
              href={treeUrl}
              target="_blank"
              rel="noreferrer"
              title="View this tree on GitHub"
            >
              <Badge
                variant="outline"
                className="gap-1 font-mono text-[10px] transition-colors hover:border-primary/50 hover:text-primary"
              >
                <GitCommitHorizontal className="size-3" />
                {shortSha}
              </Badge>
            </a>
            <Badge variant="outline">{fileCount.toLocaleString()} files</Badge>
            <Button
              variant="outline"
              size="sm"
              className="h-6 gap-1.5 px-2 text-xs"
              onClick={copyShareUrl}
            >
              {copied ? <Check className="size-3" /> : <Link2 className="size-3" />}
              {copied ? "Copied" : "Copy link"}
            </Button>
          </div>
        </div>
      </div>

      {truncated && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2.5 text-xs text-foreground/85">
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
          <p>
            GitHub returned a <strong>truncated</strong> file tree (repo is very large). Analysis
            covers the files GitHub included — not the full repository. Prefer a smaller path or a
            more specific branch when possible.
          </p>
        </div>
      )}
    </div>
  );
}
