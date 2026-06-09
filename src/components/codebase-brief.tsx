import { Sparkles, FileText, Boxes, GitFork, ShieldAlert, Compass } from "lucide-react";
import type { RepoFile, RepoMeta } from "@/types/repo";

interface Props {
  meta: RepoMeta;
  files: RepoFile[];
}

interface ModuleInfo {
  dir: string;
  count: number;
  roles: Set<string>;
}

function detectModules(files: RepoFile[]): ModuleInfo[] {
  const map = new Map<string, ModuleInfo>();
  for (const f of files) {
    const parts = f.path.split("/");
    if (parts.length < 2) continue;
    const dir = parts[0];
    const existing = map.get(dir) ?? { dir, count: 0, roles: new Set<string>() };
    existing.count += 1;
    existing.roles.add(f.role);
    map.set(dir, existing);
  }
  return [...map.values()]
    .filter((m) => m.count >= 2)
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);
}

function detectFrameworks(files: RepoFile[]): string[] {
  const paths = files.map((f) => f.path.toLowerCase());
  const has = (frag: string) => paths.some((p) => p.includes(frag));
  const tags: string[] = [];
  if (has("package.json")) {
    if (has("next.config")) tags.push("Next.js");
    else if (has("vite.config")) tags.push("Vite");
    if (has("/src/") || has("app.tsx") || has("app.jsx")) tags.push("React");
  }
  if (has("requirements.txt") || has("pyproject.toml") || paths.some((p) => p.endsWith(".py"))) {
    if (has("fastapi") || has("api.py")) tags.push("FastAPI");
    else if (has("manage.py")) tags.push("Django");
    else if (has("flask")) tags.push("Flask");
    else tags.push("Python");
  }
  if (has("cargo.toml")) tags.push("Rust");
  if (has("go.mod")) tags.push("Go");
  if (has("dockerfile")) tags.push("Docker");
  return [...new Set(tags)];
}

export function CodebaseBrief({ meta, files }: Props) {
  const modules = detectModules(files);
  const frameworks = detectFrameworks(files);
  const startHere = [...files].sort((a, b) => b.score - a.score).slice(0, 4);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        <Sparkles className="size-3.5 text-primary" />
        Heuristic brief · deeper AI analysis coming soon
      </div>

      <Section icon={<FileText className="size-4" />} title="What this repo does">
        <p className="text-sm text-foreground/90">
          {meta.description ?? `${meta.owner}/${meta.name} — no description provided on GitHub.`}
        </p>
        {frameworks.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {frameworks.map((t) => (
              <span key={t} className="rounded-full border bg-muted/50 px-2 py-0.5 text-[11px] text-foreground/80">
                {t}
              </span>
            ))}
          </div>
        )}
      </Section>

      <Section icon={<Boxes className="size-4" />} title="Main modules">
        {modules.length === 0 ? (
          <p className="text-sm text-muted-foreground">Flat project — no top-level modules detected.</p>
        ) : (
          <ul className="space-y-1.5">
            {modules.map((m) => (
              <li key={m.dir} className="flex items-baseline gap-2 text-sm">
                <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">{m.dir}/</code>
                <span className="text-xs text-muted-foreground">
                  {m.count} files · {[...m.roles].filter((r) => r !== "other").join(", ") || "mixed"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section icon={<Compass className="size-4" />} title="Start here">
        <ol className="space-y-1.5">
          {startHere.map((f, i) => (
            <li key={f.path} className="text-sm">
              <span className="text-muted-foreground">{i + 1}. </span>
              <code className="font-mono text-xs">{f.path}</code>
              <span className="text-muted-foreground"> — {f.reason}</span>
            </li>
          ))}
        </ol>
      </Section>

      <Section icon={<GitFork className="size-4" />} title="Data flow" muted>
        <p className="text-sm text-muted-foreground">
          Will trace how data moves between entrypoints, services, and storage once content analysis is enabled.
        </p>
      </Section>

      <Section icon={<ShieldAlert className="size-4" />} title="Key risks" muted>
        <p className="text-sm text-muted-foreground">
          Will surface large modules, missing tests, and untyped boundaries after AI review.
        </p>
      </Section>
    </div>
  );
}

function Section({
  icon,
  title,
  children,
  muted,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
  muted?: boolean;
}) {
  return (
    <div className={muted ? "opacity-70" : undefined}>
      <h3 className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-foreground">
        <span className="text-primary">{icon}</span>
        {title}
      </h3>
      <div className="pl-5.5">{children}</div>
    </div>
  );
}
