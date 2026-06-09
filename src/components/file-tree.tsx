import { useEffect, useRef, useState } from "react";
import { ChevronRight, Folder, FolderOpen, FileCode } from "lucide-react";
import type { TreeNode } from "@/types/repo";
import { getAncestorPaths } from "@/lib/tree";
import { cn } from "@/lib/utils";

interface Props {
  root: TreeNode;
  selectedPath?: string | null;
  onFileSelect?: (path: string) => void;
}

export function FileTree({ root, selectedPath, onFileSelect }: Props) {
  const [openDirs, setOpenDirs] = useState<Set<string>>(
    () => new Set(root.children?.filter((c) => c.type === "dir").map((c) => c.path)),
  );

  useEffect(() => {
    if (!selectedPath) return;
    setOpenDirs((prev) => {
      const next = new Set(prev);
      for (const dir of getAncestorPaths(selectedPath)) next.add(dir);
      return next;
    });
  }, [selectedPath]);

  const toggleDir = (path: string) => {
    setOpenDirs((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  return (
    <ul className="text-sm">
      {root.children?.map((child) => (
        <TreeItem
          key={child.path}
          node={child}
          depth={0}
          openDirs={openDirs}
          onToggleDir={toggleDir}
          selectedPath={selectedPath}
          onFileSelect={onFileSelect}
        />
      ))}
    </ul>
  );
}

function TreeItem({
  node,
  depth,
  openDirs,
  onToggleDir,
  selectedPath,
  onFileSelect,
}: {
  node: TreeNode;
  depth: number;
  openDirs: Set<string>;
  onToggleDir: (path: string) => void;
  selectedPath?: string | null;
  onFileSelect?: (path: string) => void;
}) {
  const selected = node.type === "file" && node.path === selectedPath;
  const itemRef = useRef<HTMLLIElement>(null);

  useEffect(() => {
    if (selected) {
      itemRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [selected]);

  if (node.type === "dir") {
    const open = openDirs.has(node.path);
    return (
      <li>
        <button
          type="button"
          onClick={() => onToggleDir(node.path)}
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
              <TreeItem
                key={c.path}
                node={c}
                depth={depth + 1}
                openDirs={openDirs}
                onToggleDir={onToggleDir}
                selectedPath={selectedPath}
                onFileSelect={onFileSelect}
              />
            ))}
          </ul>
        )}
      </li>
    );
  }

  return (
    <li ref={itemRef}>
      <button
        type="button"
        onClick={() => onFileSelect?.(node.path)}
        title={node.path}
        className={cn(
          "flex w-full items-center gap-1.5 rounded px-1.5 py-0.5 text-left hover:bg-accent",
          selected && "bg-primary/10 text-primary ring-1 ring-inset ring-primary/30",
        )}
        style={{ paddingLeft: 6 + depth * 12 + 14 }}
      >
        <FileCode
          className={cn("size-3.5 shrink-0", selected ? "text-primary" : "text-muted-foreground")}
        />
        <span className={cn("truncate", selected ? "font-medium" : "text-muted-foreground")}>
          {node.name}
        </span>
      </button>
    </li>
  );
}
