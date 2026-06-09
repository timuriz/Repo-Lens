import {
  Sparkles,
  FileText,
  Boxes,
  Compass,
  LogIn,
  ShieldAlert,
  Layers,
} from "lucide-react";

import type { RepoAnalysis } from "@/types/analysis";

interface Props {
  analysis: RepoAnalysis;
}

export function AiBrief({ analysis }: Props) {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        <Sparkles className="size-3.5 text-primary" />
        AI analysis · Gemini
      </div>

      <Section icon={<FileText className="size-4" />} title="What this repo does">
        <p className="text-sm text-foreground/90">{analysis.summary}</p>
      </Section>

      <Section icon={<Layers className="size-4" />} title="Architecture">
        <p className="text-sm text-foreground/90 whitespace-pre-line">{analysis.architecture}</p>
      </Section>

      {analysis.entryPoints.length > 0 && (
        <Section icon={<LogIn className="size-4" />} title="Entry points">
          <ul className="space-y-1.5">
            {analysis.entryPoints.map((e) => (
              <li key={e.path} className="text-sm">
                <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">{e.path}</code>
                <span className="text-muted-foreground"> — {e.why}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {analysis.startHere.length > 0 && (
        <Section icon={<Compass className="size-4" />} title="Start here">
          <ol className="space-y-1.5">
            {[...analysis.startHere]
              .sort((a, b) => a.step - b.step)
              .map((s) => (
                <li key={`${s.step}-${s.path}`} className="text-sm">
                  <span className="text-muted-foreground">{s.step}. </span>
                  <code className="font-mono text-xs">{s.path}</code>
                  <span className="text-muted-foreground"> — {s.reason}</span>
                </li>
              ))}
          </ol>
        </Section>
      )}

      {analysis.modules.length > 0 && (
        <Section icon={<Boxes className="size-4" />} title="Modules">
          <div className="space-y-2.5">
            {analysis.modules.map((m) => (
              <div key={m.name} className="rounded-md border bg-muted/30 p-2.5">
                <p className="text-sm font-semibold">{m.name}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{m.purpose}</p>
                {m.files.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {m.files.map((f) => (
                      <code
                        key={f}
                        className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-foreground/80"
                        title={f}
                      >
                        {f.split("/").pop()}
                      </code>
                    ))}
                  </div>
                )}
                {m.risks.length > 0 && (
                  <ul className="mt-1.5 space-y-0.5">
                    {m.risks.map((r) => (
                      <li
                        key={r}
                        className="flex items-start gap-1.5 text-xs text-amber-700 dark:text-amber-300"
                      >
                        <ShieldAlert className="mt-0.5 size-3 shrink-0" />
                        {r}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </Section>
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
