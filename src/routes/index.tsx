import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { Loader2, Telescope } from "lucide-react";
import { toast, Toaster } from "sonner";

import { RepoInput } from "@/components/repo-input";
import { FileTree } from "@/components/file-tree";
import { ImportantFiles } from "@/components/important-files";
import { AiOverviewPlaceholder } from "@/components/ai-overview-placeholder";
import { AiBrief } from "@/components/ai-brief";
import { AiErrorBanner, AiNoKeyBanner } from "@/components/ai-status-banner";
import { CodebaseBrief } from "@/components/codebase-brief";
import { RepoHeader } from "@/components/repo-header";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchRepo, type FetchRepoResult } from "@/lib/github";
import { buildTree } from "@/lib/tree";
import { buildStructureSummary, selectFilesForAnalysis } from "@/lib/select-files";
import { analyzeRepo } from "@/lib/api/repo.functions";
import { toFriendlyAiError, type FriendlyAiError } from "@/lib/ai-errors";
import type { RepoAnalysis } from "@/types/analysis";

type AiState =
  | { phase: "idle" }
  | { phase: "loading" }
  | { phase: "done"; analysis: RepoAnalysis }
  | { phase: "no_key" }
  | { phase: "error"; error: FriendlyAiError };

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
  const [aiState, setAiState] = useState<AiState>({ phase: "idle" });
  const analysisRun = useRef(0);

  const tree = useMemo(() => (data ? buildTree(data.files) : null), [data]);

  const startAnalysis = async (result: FetchRepoResult) => {
    const run = ++analysisRun.current;
    setAiState({ phase: "loading" });

    const selected = selectFilesForAnalysis(result.files);
    try {
      const res = await analyzeRepo({
        data: {
          owner: result.meta.owner,
          name: result.meta.name,
          branch: result.meta.defaultBranch,
          description: result.meta.description,
          structure: buildStructureSummary(result.files).slice(0, 6_000),
          paths: selected.map((f) => f.path),
        },
      });
      if (run !== analysisRun.current) return; // a newer repo was submitted

      if (res.status === "ok") {
        setAiState({ phase: "done", analysis: res.analysis });
      } else if (res.status === "no_api_key") {
        setAiState({ phase: "no_key" });
      } else {
        setAiState({ phase: "error", error: res.error });
      }
    } catch (err) {
      if (run !== analysisRun.current) return;
      setAiState({ phase: "error", error: toFriendlyAiError(err) });
    }
  };

  const handleSubmit = async (url: string) => {
    setLoading(true);
    try {
      const result = await fetchRepo(url);
      setData(result);
      toast.success(`Loaded ${result.meta.owner}/${result.meta.name}`);
      void startAnalysis(result);
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
                <ScrollArea className="h-[calc(100vh-320px)] min-h-[400px] pr-2">
                  <BriefPanel
                    aiState={aiState}
                    data={data}
                    onRetry={() => void startAnalysis(data)}
                  />
                </ScrollArea>
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

function BriefPanel({
  aiState,
  data,
  onRetry,
}: {
  aiState: AiState;
  data: FetchRepoResult;
  onRetry: () => void;
}) {
  if (aiState.phase === "done") {
    return <AiBrief analysis={aiState.analysis} />;
  }

  return (
    <div className="space-y-4">
      {aiState.phase === "loading" && (
        <div className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-3 text-xs text-foreground/80">
          <Loader2 className="size-3.5 animate-spin text-primary" />
          Generating AI analysis… reading key files and building the onboarding guide.
        </div>
      )}
      {aiState.phase === "no_key" && <AiNoKeyBanner />}
      {aiState.phase === "error" && (
        <AiErrorBanner error={aiState.error} onRetry={onRetry} retrying={false} />
      )}
      <CodebaseBrief meta={data.meta} files={data.files} />
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
          <div
            key={i}
            className="h-4 w-full animate-pulse rounded bg-muted/50"
            style={{ width: `${50 + ((i * 37) % 45)}%` }}
          />
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
