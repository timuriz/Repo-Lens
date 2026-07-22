import { useEffect, useState } from "react";
import { Expand, FileCode, Minimize2, X } from "lucide-react";

import type { RepoAnalysis } from "@/types/analysis";
import { fetchFilePreview } from "@/lib/api/repo.functions";
import { getFileContext } from "@/lib/file-context";
import { languageLabel } from "@/lib/language";
import { CodeBlock } from "@/components/code-block";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface Props {
  path: string | null;
  onClose: () => void;
  sources: Record<string, string>;
  analysis: RepoAnalysis | null;
  owner: string;
  repo: string;
  branch: string;
}

export function FilePreviewDrawer({
  path,
  onClose,
  sources,
  analysis,
  owner,
  repo,
  branch,
}: Props) {
  const open = path !== null;
  const [content, setContent] = useState<string | null>(null);
  const [truncated, setTruncated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!path) {
      setContent(null);
      setError(null);
      setExpanded(false);
      return;
    }

    if (sources[path]) {
      setContent(sources[path]);
      setTruncated(sources[path].length >= 48_000);
      setError(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);
    setContent(null);

    void fetchFilePreview({ data: { owner, name: repo, branch, path } }).then((res) => {
      if (cancelled) return;
      if (res.status === "ok") {
        setContent(res.content);
        setTruncated(res.truncated);
      } else {
        setError(res.message);
      }
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [path, sources, owner, repo, branch]);

  const context = path && analysis ? getFileContext(path, analysis) : null;
  const lineCount = content ? content.split("\n").length : 0;

  return (
    <Drawer
      open={open}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <DrawerContent
        className={cn(
          "flex flex-col outline-none",
          expanded ? "h-[95vh] max-h-[95vh]" : "h-[75vh] max-h-[75vh]",
        )}
      >
        <DrawerHeader className="shrink-0 border-b pb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <DrawerTitle className="flex items-center gap-2 text-base">
                <FileCode className="size-4 shrink-0 text-primary" />
                <span className="truncate font-mono text-sm">{path}</span>
              </DrawerTitle>
              {context && (
                <DrawerDescription className="mt-2 text-left text-sm text-foreground/80">
                  <span className="font-medium text-foreground">Why it matters: </span>
                  {context}
                </DrawerDescription>
              )}
              {!context && path && (
                <DrawerDescription className="mt-2 text-left">
                  Referenced in the codebase analysis.
                </DrawerDescription>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-8"
                title={expanded ? "Collapse" : "Expand"}
                onClick={() => setExpanded((v) => !v)}
              >
                {expanded ? <Minimize2 className="size-4" /> : <Expand className="size-4" />}
              </Button>
              <DrawerClose asChild>
                <Button variant="ghost" size="icon" className="size-8">
                  <X className="size-4" />
                </Button>
              </DrawerClose>
            </div>
          </div>
        </DrawerHeader>

        <div
          data-vaul-no-drag
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-3"
        >
          {loading && (
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-4/6" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}
          {!loading && !error && content && path && (
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
                  {languageLabel(path)}
                </Badge>
                <Badge variant="outline" className="text-[10px] tabular-nums">
                  {lineCount} lines
                </Badge>
                {truncated && (
                  <Badge variant="outline" className="text-[10px]">
                    Truncated at ~48KB
                  </Badge>
                )}
              </div>
              <CodeBlock code={content} path={path} />
            </div>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
