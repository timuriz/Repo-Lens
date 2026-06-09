import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Telescope } from "lucide-react";
import { toast, Toaster } from "sonner";

import { RepoInput } from "@/components/repo-input";
import { FileTree } from "@/components/file-tree";
import { ImportantFiles } from "@/components/important-files";
import { AiOverviewPlaceholder } from "@/components/ai-overview-placeholder";
import { CodebaseBrief } from "@/components/codebase-brief";
import { RepoHeader } from "@/components/repo-header";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchRepo, type FetchRepoResult } from "@/lib/github";
import { buildTree } from "@/lib/tree";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "RepoLens — Understand any GitHub repo" },
      {
        name: "description",
        content:
          "Paste a GitHub URL to see a clear map of the project: file tree, the most important files, and a start-here guide.",
      },
      { property: "og:title", content: "RepoLens — Understand any GitHub repo" },
      {
        property: "og:description",
        content:
          "Paste a GitHub URL to see a clear map of the project: file tree, important files, and a start-here guide.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<FetchRepoResult | null>(null);

  const tree = useMemo(() => (data ? buildTree(data.files) : null), [data]);

  const handleSubmit = async (url: string) => {
    setLoading(true);
    try {
      const result = await fetchRepo(url);
      setData(result);
      toast.success(`Loaded ${result.meta.owner}/${result.meta.name}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load repository";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Toaster richColors position="top-right" />

      <header className="border-b">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-4">
          <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Telescope className="size-5" />
          </div>
          <div>
            <h1 className="text-base font-semibold leading-tight">RepoLens</h1>
            <p className="text-xs text-muted-foreground">Understand any GitHub repo at a glance</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6">
        <div className="mb-6">
          <RepoInput onSubmit={handleSubmit} loading={loading} />
        </div>

        {loading && <LoadingState />}

        {!loading && !data && <EmptyState />}

        {!loading && data && tree && (
          <div className="space-y-4">
            <RepoHeader meta={data.meta} fileCount={data.files.length} truncated={data.truncated} />

            <div className="grid gap-4 md:grid-cols-[240px_1fr_280px] lg:grid-cols-[280px_1fr_320px]">
              <Panel title="File Tree">
                <ScrollArea className="h-[calc(100vh-320px)] min-h-[400px] pr-2">
                  <FileTree root={tree} />
                </ScrollArea>
              </Panel>

              <Panel title="Codebase Brief">
                <CodebaseBrief meta={data.meta} files={data.files} />
              </Panel>

              <Panel title="Start Here">
                <ScrollArea className="h-[calc(100vh-320px)] min-h-[400px] pr-2">
                  <ImportantFiles files={data.files} />
                </ScrollArea>
              </Panel>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border bg-card p-3">
      <h2 className="mb-3 px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </h2>
      {children}
    </section>
  );
}

function EmptyState() {
  return (
    <div className="grid gap-4 md:grid-cols-[240px_1fr_280px] lg:grid-cols-[280px_1fr_320px]">
      <PlaceholderPanel title="File Tree" lines={10} />
      <div className="rounded-lg border bg-card p-3">
        <h2 className="mb-3 px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Codebase Brief
        </h2>
        <AiOverviewPlaceholder />
      </div>
      <PlaceholderPanel title="Start Here" lines={6} />
    </div>
  );
}

function PlaceholderPanel({ title, lines }: { title: string; lines: number }) {
  return (
    <section className="rounded-lg border bg-card p-3">
      <h2 className="mb-3 px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </h2>
      <div className="space-y-2">
        {Array.from({ length: lines }).map((_, i) => (
          <div key={i} className="h-4 w-full animate-pulse rounded bg-muted/50" style={{ width: `${50 + ((i * 37) % 45)}%` }} />
        ))}
      </div>
    </section>
  );
}

function LoadingState() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-20 w-full" />
      <div className="grid gap-4 md:grid-cols-[240px_1fr_280px] lg:grid-cols-[280px_1fr_320px]">
        <Skeleton className="h-[400px]" />
        <Skeleton className="h-[400px]" />
        <Skeleton className="h-[400px]" />
      </div>
    </div>
  );
}
