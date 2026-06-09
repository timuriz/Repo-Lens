import { Clock, KeyRound, RotateCw, Sparkles, TriangleAlert } from "lucide-react";

import type { FriendlyAiError } from "@/lib/ai-errors";
import { Button } from "@/components/ui/button";

interface Props {
  error: FriendlyAiError;
  onRetry?: () => void;
  retrying?: boolean;
}

export function AiErrorBanner({ error, onRetry, retrying }: Props) {
  const showRetry = error.kind === "temporary" && onRetry;

  if (error.kind === "temporary") {
    return (
      <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-3">
        <div className="flex items-start gap-2.5">
          <Clock className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <div className="min-w-0 flex-1 space-y-1">
            <p className="text-sm font-medium text-foreground">{error.title}</p>
            <p className="text-xs leading-relaxed text-muted-foreground">{error.message}</p>
            <p className="text-xs text-muted-foreground/80">
              Showing heuristic brief in the meantime.
            </p>
            {showRetry && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-2 h-7 border-amber-500/40 bg-background/80 text-xs hover:bg-amber-500/10"
                onClick={onRetry}
                disabled={retrying}
              >
                <RotateCw className={`size-3.5 ${retrying ? "animate-spin" : ""}`} />
                Try again
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (error.kind === "config") {
    return (
      <div className="rounded-lg border bg-muted/50 px-3 py-3">
        <div className="flex items-start gap-2.5">
          <KeyRound className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <div className="min-w-0 space-y-1">
            <p className="text-sm font-medium text-foreground">{error.title}</p>
            <p className="text-xs leading-relaxed text-muted-foreground">{error.message}</p>
            <p className="text-xs text-muted-foreground/80">Showing heuristic brief instead.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-3">
      <div className="flex items-start gap-2.5">
        <TriangleAlert className="mt-0.5 size-4 shrink-0 text-destructive" />
        <div className="min-w-0 space-y-1">
          <p className="text-sm font-medium text-foreground">{error.title}</p>
          <p className="text-xs leading-relaxed text-muted-foreground">{error.message}</p>
          <p className="text-xs text-muted-foreground/80">Showing heuristic brief instead.</p>
        </div>
      </div>
    </div>
  );
}

export function AiNoKeyBanner() {
  return (
    <div className="rounded-lg border bg-muted/50 px-3 py-3">
      <div className="flex items-start gap-2.5">
        <Sparkles className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">AI analysis disabled</p>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Add <code className="rounded bg-muted px-1 font-mono">GEMINI_API_KEY</code> to your .env
            to enable AI-generated onboarding. Showing heuristic brief.
          </p>
        </div>
      </div>
    </div>
  );
}
