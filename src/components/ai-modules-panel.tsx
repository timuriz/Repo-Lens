import type { AnalysisModule } from "@/types/analysis";
import { FileRef } from "@/components/file-ref";

interface Props {
  modules: AnalysisModule[];
  onFileSelect?: (path: string) => void;
}

export function AiModulesPanel({ modules, onFileSelect }: Props) {
  if (modules.length === 0) {
    return <p className="text-sm text-muted-foreground">No modules detected.</p>;
  }

  return (
    <div className="space-y-2.5">
      {modules.map((m) => (
        <div key={m.name} className="rounded-md border bg-muted/30 p-2.5">
          <p className="text-sm font-semibold">{m.name}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{m.purpose}</p>
          {m.files.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {m.files.map((f) => (
                <FileRef key={f} path={f} onSelect={onFileSelect} variant="chip" />
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
