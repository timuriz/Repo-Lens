import { FileText, Boxes, GitFork, ShieldAlert, Compass } from "lucide-react";

export function AiOverviewPlaceholder() {
  const sections = [
    { icon: FileText, title: "What this repo does" },
    { icon: Boxes, title: "Architecture" },
    { icon: Compass, title: "Main modules" },
    { icon: GitFork, title: "Data flow" },
    { icon: ShieldAlert, title: "Key risks" },
  ];

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Paste a GitHub URL above. A structured codebase brief will appear here.
      </p>
      <ul className="space-y-2">
        {sections.map(({ icon: Icon, title }) => (
          <li
            key={title}
            className="flex items-center gap-2 rounded-md border border-dashed bg-muted/20 px-3 py-2"
          >
            <Icon className="size-4 text-muted-foreground/70" />
            <span className="text-sm text-muted-foreground">{title}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
