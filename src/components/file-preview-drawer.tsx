import { useEffect, useState } from "react";
import { FileCode, X } from "lucide-react";

import type { RepoAnalysis } from "@/types/analysis";
import { fetchFilePreview } from "@/lib/api/repo.functions";
import { getFileContext } from "@/lib/file-context";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";

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

  useEffect(() => {
    if (!path) {
      setContent(null);
      setError(null);
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

  return (
    <Drawer open={open} onOpenChange={(v) => !v && onClose()}>
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader className="border-b pb-3">
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
            <DrawerClose asChild>
              <Button variant="ghost" size="icon" className="size-8 shrink-0">
                <X className="size-4" />
              </Button>
            </DrawerClose>
          </div>
        </DrawerHeader>

        <ScrollArea className="max-h-[50vh] px-4 py-3">
          {loading && (
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-4/6" />
            </div>
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}
          {!loading && !error && content && (
            <>
              {truncated && (
                <Badge variant="outline" className="mb-2 text-[10px]">
                  Truncated preview
                </Badge>
              )}
              <pre className="whitespace-pre-wrap break-words font-mono text-xs leading-relaxed text-foreground/90">
                {content}
              </pre>
            </>
          )}
        </ScrollArea>
      </DrawerContent>
    </Drawer>
  );
}
