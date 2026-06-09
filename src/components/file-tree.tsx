import { useState } from "react";
import { ChevronRight, Folder, FolderOpen, FileCode } from "lucide-react";
import type { TreeNode } from "@/types/repo";
import { cn } from "@/lib/utils";

interface Props {
  root: TreeNode;
}

export function FileTree({ root }: Props) {
  return (
    <ul className="text-sm">
      {root.children?.map((child) => (
        <TreeItem key={child.path} node={child} depth={0} defaultOpen />
      ))}
    </ul>
  );
}

function TreeItem({
  node,
  depth,
  defaultOpen = false,
}: {
  node: TreeNode;
  depth: number;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen && depth < 1);

  if (node.type === "dir") {
    return (
      <li>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex w-full items-center gap-1.5 rounded px-1.5 py-0.5 text-left hover:bg-accent"
          style={{ paddingLeft: 6 + depth * 12 }}
        >
          <ChevronRight
            className={cn(
              "size-3.5 shrink-0 text-muted-foreground transition-transform",
              open && "rotate-90",
            )}
          />
          {open ? (
            <FolderOpen className="size-4 shrink-0 text-primary/70" />
          ) : (
            <Folder className="size-4 shrink-0 text-primary/70" />
          )}
          <span className="truncate">{node.name}</span>
        </button>
        {open && node.children && (
          <ul>
            {node.children.map((c) => (
              <TreeItem key={c.path} node={c} depth={depth + 1} />
            ))}
          </ul>
        )}
      </li>
    );
  }

  return (
    <li
      className="flex items-center gap-1.5 rounded px-1.5 py-0.5 hover:bg-accent"
      style={{ paddingLeft: 6 + depth * 12 + 14 }}
      title={node.path}
    >
      <FileCode className="size-3.5 shrink-0 text-muted-foreground" />
      <span className="truncate text-muted-foreground">{node.name}</span>
    </li>
  );
}
