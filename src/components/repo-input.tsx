import { useEffect, useState, type FormEvent } from "react";
import { Search, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface Props {
  onSubmit: (url: string) => void;
  loading: boolean;
  /** Prefill from shareable ?repo= query. */
  initialUrl?: string;
}

export function RepoInput({ onSubmit, loading, initialUrl }: Props) {
  const [url, setUrl] = useState(initialUrl ?? "");

  useEffect(() => {
    if (initialUrl) setUrl(initialUrl);
  }, [initialUrl]);

  const handle = (e: FormEvent) => {
    e.preventDefault();
    if (!url.trim() || loading) return;
    onSubmit(url);
  };

  return (
    <form onSubmit={handle} className="flex w-full gap-2">
      <div className="relative flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://github.com/owner/repo or owner/repo/tree/branch"
          className="pl-9"
          disabled={loading}
          aria-label="GitHub repository URL"
        />
      </div>
      <Button type="submit" disabled={loading || !url.trim()}>
        {loading ? <Loader2 className="size-4 animate-spin" /> : "Analyze"}
      </Button>
    </form>
  );
}
