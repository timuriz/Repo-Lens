import { useEffect, useState } from "react";
import { createHighlighter, type Highlighter } from "shiki";

import { languageFromPath, languageLabel } from "@/lib/language";
import { cn } from "@/lib/utils";

interface Props {
  code: string;
  path: string;
  className?: string;
}

/** Keep the highlighter small — only langs RepoPrism commonly analyzes. */
const SUPPORTED_LANGS = [
  "typescript",
  "tsx",
  "javascript",
  "jsx",
  "python",
  "swift",
  "kotlin",
  "go",
  "rust",
  "java",
  "json",
  "yaml",
  "toml",
  "markdown",
  "html",
  "css",
  "bash",
  "sql",
  "plaintext",
] as const;

let highlighterPromise: Promise<Highlighter> | null = null;

function getHighlighter(): Promise<Highlighter> {
  highlighterPromise ??= createHighlighter({
    themes: ["github-light", "github-dark"],
    langs: [...SUPPORTED_LANGS],
  });
  return highlighterPromise;
}

function isDarkMode(): boolean {
  if (typeof document === "undefined") return false;
  return document.documentElement.classList.contains("dark");
}

function PlainFallback({ code, className }: { code: string; className?: string }) {
  return (
    <pre
      className={cn(
        "overflow-x-auto rounded-md border bg-[#f6f8fa] p-3 font-mono text-xs leading-relaxed dark:bg-[#0d1117]",
        className,
      )}
    >
      <code>
        {code.split("\n").map((line, i) => (
          <span key={i} className="block">
            <span className="mr-4 inline-block w-8 select-none text-right text-muted-foreground/50">
              {i + 1}
            </span>
            {line || "\n"}
          </span>
        ))}
      </code>
    </pre>
  );
}

export function CodeBlock({ code, path, className }: Props) {
  const [html, setHtml] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const detected = languageFromPath(path);
  const lang =
    detected && (SUPPORTED_LANGS as readonly string[]).includes(detected) ? detected : "plaintext";

  useEffect(() => {
    let cancelled = false;
    setHtml(null);
    setFailed(false);

    const theme = isDarkMode() ? "github-dark" : "github-light";

    void getHighlighter()
      .then((highlighter) => {
        if (cancelled) return;
        const result = highlighter.codeToHtml(code, {
          lang,
          theme,
          transformers: [
            {
              line(node, line) {
                node.properties["data-line"] = String(line);
              },
            },
          ],
        });
        setHtml(result);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });

    return () => {
      cancelled = true;
    };
  }, [code, lang]);

  if (failed) return <PlainFallback code={code} className={className} />;

  if (!html) {
    return (
      <div
        className={cn(
          "rounded-md border bg-[#f6f8fa] px-3 py-4 text-xs text-muted-foreground dark:bg-[#0d1117]",
          className,
        )}
      >
        Highlighting {languageLabel(path)}…
      </div>
    );
  }

  return (
    <div
      className={cn("repoprism-code-wrap overflow-x-auto rounded-md border", className)}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
