import type { RepoFile, TreeNode } from "@/types/repo";

export function buildTree(files: RepoFile[]): TreeNode {
  const root: TreeNode = { name: "", path: "", type: "dir", children: [] };

  for (const file of files) {
    const parts = file.path.split("/");
    let current = root;
    for (let i = 0; i < parts.length; i++) {
      const name = parts[i];
      const isLeaf = i === parts.length - 1;
      const path = parts.slice(0, i + 1).join("/");
      current.children ??= [];
      let next = current.children.find((c) => c.name === name);
      if (!next) {
        next = isLeaf
          ? { name, path, type: "file", size: file.size, score: file.score }
          : { name, path, type: "dir", children: [] };
        current.children.push(next);
      }
      current = next;
    }
  }

  sortNode(root);
  return root;
}

function sortNode(node: TreeNode) {
  if (!node.children) return;
  node.children.sort((a, b) => {
    if (a.type !== b.type) return a.type === "dir" ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
  node.children.forEach(sortNode);
}
