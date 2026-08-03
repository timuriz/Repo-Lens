import { useState } from "react";
import { ArrowRight, Compass, FileText, Layers, LogIn, Sparkles } from "lucide-react";

import type { RepoAnalysis } from "@/types/analysis";
import { countStartHereGroups } from "@/lib/start-here";
import { FileRef } from "@/components/file-ref";
import { AiModulesPanel } from "@/components/ai-modules-panel";
import { AiRisksPanel, RiskCard } from "@/components/ai-risks-panel";
import { AiContributePanel } from "@/components/ai-contribute-panel";
import { ArchitectureGraph } from "@/components/architecture-graph";
import { sortRisksBySeverity } from "@/lib/risk-utils";
import { StartHereList } from "@/components/start-here-list";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

interface Props {
  analysis: RepoAnalysis;
  fileCount: number;
  analyzedCount: number;
  fromCache?: boolean;
  branch?: string;
  treeSha?: string;
  repoUrl?: string;
  onFileSelect?: (path: string) => void;
}

export function AiAnalysisPanel({
  analysis,
  fileCount,
  analyzedCount,
  fromCache,
  branch,
  treeSha,
  repoUrl,
  onFileSelect,
}: Props) {
  const [tab, setTab] = useState("brief");
  const startPointCount = countStartHereGroups(analysis.startHere);
  const tasks = analysis.goodFirstTasks ?? [];
  const shortSha = treeSha?.slice(0, 7);
  const treeUrl = repoUrl && treeSha ? `${repoUrl}/tree/${treeSha}` : undefined;

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          <Sparkles className="size-3.5 text-primary" />
          AI analysis · Gemini
          {fromCache && (
            <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-normal normal-case tracking-normal">
              cached
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          {fileCount} files · {analyzedCount} analyzed · {analysis.modules.length} modules ·{" "}
          {analysis.risks.length} findings · {startPointCount} start points
        </p>
        {(branch || shortSha) && (
          <p className="text-[11px] text-muted-foreground/80">
            Current for
            {branch ? (
              <>
                {" "}
                branch <span className="font-medium text-foreground/70">{branch}</span>
              </>
            ) : null}
            {shortSha ? (
              <>
                {" · "}
                tree{" "}
                {treeUrl ? (
                  <a
                    href={treeUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded bg-muted px-1 font-mono hover:text-primary hover:underline"
                    title="View this tree on GitHub"
                  >
                    {shortSha}
                  </a>
                ) : (
                  <code className="rounded bg-muted px-1 font-mono">{shortSha}</code>
                )}
              </>
            ) : null}
          </p>
        )}
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="h-8 w-full justify-start">
          <TabsTrigger value="brief" className="text-xs">
            Brief
          </TabsTrigger>
          <TabsTrigger value="modules" className="text-xs">
            Modules
          </TabsTrigger>
          <TabsTrigger value="map" className="text-xs">
            Map
          </TabsTrigger>
          <TabsTrigger value="risks" className="text-xs">
            Risks
            {analysis.risks.length > 0 && (
              <span className="ml-1.5 rounded-full bg-primary/15 px-1.5 text-[10px] font-semibold text-primary">
                {analysis.risks.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="contribute" className="text-xs">
            Contribute
            {tasks.length > 0 && (
              <span className="ml-1.5 rounded-full bg-primary/15 px-1.5 text-[10px] font-semibold text-primary">
                {tasks.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="brief" className="mt-4">
          <BriefTab
            analysis={analysis}
            onFileSelect={onFileSelect}
            onShowRisks={() => setTab("risks")}
          />
        </TabsContent>

        <TabsContent value="modules" className="mt-4">
          <AiModulesPanel modules={analysis.modules} onFileSelect={onFileSelect} />
        </TabsContent>

        <TabsContent value="map" className="mt-4">
          <ArchitectureGraph modules={analysis.modules} edges={analysis.edges} />
        </TabsContent>

        <TabsContent value="risks" className="mt-4">
          <AiRisksPanel risks={analysis.risks} onFileSelect={onFileSelect} />
        </TabsContent>

        <TabsContent value="contribute" className="mt-4">
          <AiContributePanel tasks={tasks} onFileSelect={onFileSelect} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

const ARCHITECTURE_CLAMP = 280;

function BriefTab({
  analysis,
  onFileSelect,
  onShowRisks,
}: {
  analysis: RepoAnalysis;
  onFileSelect?: (path: string) => void;
  onShowRisks: () => void;
}) {
  const [archExpanded, setArchExpanded] = useState(false);
  const archIsLong = analysis.architecture.length > ARCHITECTURE_CLAMP;
  const topRisks = sortRisksBySeverity(analysis.risks).slice(0, 3);

  return (
    <div className="space-y-5">
      <Section icon={<FileText className="size-4" />} title="What this repo does">
        <p className="text-sm text-foreground/90">{analysis.summary}</p>
      </Section>

      <Section icon={<Layers className="size-4" />} title="Architecture">
        <p
          className={cn(
            "text-sm text-foreground/90 whitespace-pre-line",
            archIsLong && !archExpanded && "line-clamp-4",
          )}
        >
          {analysis.architecture}
        </p>
        {archIsLong && (
          <button
            type="button"
            onClick={() => setArchExpanded((v) => !v)}
            className="mt-1 text-xs font-medium text-primary hover:underline"
          >
            {archExpanded ? "Show less" : "Show more"}
          </button>
        )}
      </Section>

      {analysis.startHere.length > 0 && (
        <Section icon={<Compass className="size-4" />} title="Start here">
          <StartHereList steps={analysis.startHere} onFileSelect={onFileSelect} />
        </Section>
      )}

      {topRisks.length > 0 && (
        <Section icon={<Sparkles className="size-4" />} title="Top findings">
          <div className="space-y-2">
            {topRisks.map((risk, i) => (
              <RiskCard key={`${risk.path}-${i}`} risk={risk} onFileSelect={onFileSelect} />
            ))}
            {analysis.risks.length > topRisks.length && (
              <button
                type="button"
                onClick={onShowRisks}
                className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
              >
                View all {analysis.risks.length} findings
                <ArrowRight className="size-3" />
              </button>
            )}
          </div>
        </Section>
      )}

      {analysis.entryPoints.length > 0 && (
        <Accordion type="single" collapsible>
          <AccordionItem value="entry-points" className="border-b-0">
            <AccordionTrigger className="py-2 text-sm font-semibold hover:no-underline">
              <span className="flex items-center gap-1.5">
                <LogIn className="size-4 text-primary" />
                Entry points
                <span className="font-normal text-muted-foreground">
                  ({analysis.entryPoints.length})
                </span>
              </span>
            </AccordionTrigger>
            <AccordionContent>
              <ul className="space-y-2 pl-5.5">
                {analysis.entryPoints.map((e) => (
                  <li key={e.path} className="text-sm">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <FileRef path={e.path} onSelect={onFileSelect} />
                      <span className="text-xs font-medium text-foreground/70">{e.role}</span>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">{e.reason}</p>
                  </li>
                ))}
              </ul>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      )}
    </div>
  );
}

function Section({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h3 className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-foreground">
        <span className="text-primary">{icon}</span>
        {title}
      </h3>
      <div className="pl-5.5">{children}</div>
    </div>
  );
}
