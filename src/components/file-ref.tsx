import { cn } from "@/lib/utils";

interface Props {
  path: string;
  onSelect?: (path: string) => void;
  /** inline — full path inside text; chip — compact basename pill. */
  variant?: "inline" | "chip";
  className?: string;
}

/** Clickable file reference: clicking highlights the file in the tree. */
export function FileRef({ path, onSelect, variant = "inline", className }: Props) {
  const label = variant === "chip" ? (path.split("/").pop() ?? path) : path;

  if (!onSelect) {
    return (
      <code
        className={cn("rounded bg-muted px-1.5 py-0.5 font-mono text-xs", className)}
        title={path}
      >
        {label}
      </code>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onSelect(path)}
      title={path}
      className={cn(
        "rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground/90 underline-offset-2 transition-colors hover:bg-primary/15 hover:text-primary hover:underline",
        variant === "chip" && "text-[10px] text-foreground/80",
        className,
      )}
    >
      {label}
    </button>
  );
}
