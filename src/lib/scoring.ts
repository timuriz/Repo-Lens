import type { FileRole } from "@/types/repo";

export interface FileClassification {
  score: number;
  role: FileRole;
  reason: string;
}

export function classifyFile(path: string): FileClassification {
  const lower = path.toLowerCase();
  const basename = lower.split("/").pop() ?? "";
  const depth = path.split("/").length - 1;

  let score = 0;
  let role: FileRole = "other";
  let reason = "";

  // --- Overview / docs (highest onboarding value) ---
  if (/^readme(\.md|\.rst|\.txt)?$/.test(basename)) {
    score += 12;
    role = "overview";
    reason = "Project overview and setup instructions";
  } else if (basename === "contributing.md") {
    score += 4;
    role = "docs";
    reason = "Contribution guide";
  } else if (basename === "architecture.md" || basename === "design.md") {
    score += 8;
    role = "docs";
    reason = "Architecture notes";
  } else if (lower.startsWith("docs/") && basename.endsWith(".md")) {
    score += 3;
    role = "docs";
    reason = "Documentation";
  }

  // --- API entrypoints ---
  else if (/^(api|server|app|main)\.py$/.test(basename)) {
    score += 10;
    role = "api";
    reason = "Backend API entrypoint";
  } else if (
    /^(server|index|main)\.(t|j)sx?$/.test(basename) &&
    (lower.includes("/server") || lower.includes("/backend") || lower.includes("/api"))
  ) {
    score += 9;
    role = "api";
    reason = "Backend server entrypoint";
  } else if (
    lower.includes("/routes/") ||
    lower.includes("/api/") ||
    lower.includes("/controllers/")
  ) {
    score += 5;
    role = "api";
    reason = "HTTP route or controller";
  } else if (lower.includes("/middleware")) {
    score += 4;
    role = "api";
    reason = "Request middleware";
  }

  // --- ML / model logic ---
  else if (/inference|train|model|predict|explainability/.test(basename)) {
    score += 8;
    role = "model";
    reason = "Model or inference logic";
  }

  // --- UI entrypoints ---
  else if (/^app\.(t|j)sx?$/.test(basename)) {
    score += 9;
    role = "ui";
    reason = "UI entrypoint (root component)";
  } else if (/^main\.(t|j)sx?$/.test(basename)) {
    score += 8;
    role = "ui";
    reason = "Client bootstrap";
  } else if (/^index\.(t|j)sx?$/.test(basename) && lower.includes("/src/")) {
    score += 6;
    role = "ui";
    reason = "App entry module";
  } else if (/^router\.(t|j)sx?$/.test(basename)) {
    score += 6;
    role = "ui";
    reason = "Client-side router setup";
  } else if (lower.includes("/pages/") || lower.includes("/views/")) {
    score += 4;
    role = "ui";
    reason = "Page component";
  } else if (lower.includes("/components/")) {
    score += 1;
    role = "ui";
    reason = "UI component";
  } else if (lower.includes("/hooks/")) {
    score += 1;
    role = "ui";
    reason = "React hook";
  } else if (lower.includes("/store/") || lower.includes("/stores/")) {
    score += 3;
    role = "ui";
    reason = "State management";
  }

  // --- Config / build ---
  else if (basename === "package.json") {
    score += 5;
    role = "config";
    reason = "Dependencies and npm scripts";
  } else if (
    basename === "pyproject.toml" ||
    basename === "requirements.txt" ||
    basename === "pipfile"
  ) {
    score += 5;
    role = "config";
    reason = "Python dependencies";
  } else if (basename === "cargo.toml" || basename === "go.mod") {
    score += 5;
    role = "config";
    reason = "Project manifest";
  } else if (/^(vite|next|webpack|rollup|tailwind|astro|nuxt)\.config\.(t|j)s$/.test(basename)) {
    score += 4;
    role = "config";
    reason = "Build configuration";
  } else if (basename === "tsconfig.json") {
    score += 2;
    role = "config";
    reason = "TypeScript configuration";
  } else if (basename === "dockerfile" || basename === "docker-compose.yml") {
    score += 4;
    role = "config";
    reason = "Container setup";
  } else if (basename === "schema.prisma" || lower.includes("/migrations/")) {
    score += 6;
    role = "config";
    reason = "Database schema";
  }

  // --- Fallback role from extension ---
  if (role === "other") {
    if (/\.(tsx?|jsx?)$/.test(basename)) {
      role = "ui";
      reason = "Source module";
      score += 1;
    } else if (/\.py$/.test(basename)) {
      role = "api";
      reason = "Python module";
      score += 1;
    } else if (/\.md$/.test(basename)) {
      role = "docs";
      reason = "Documentation";
    }
  }

  // Penalties
  if (lower.includes("/__tests__/") || /\.(test|spec)\./.test(lower)) score -= 4;
  if (/\.d\.ts$/.test(basename)) score -= 3;
  if (basename.startsWith(".")) score -= 2;
  score -= Math.max(0, depth - 3);

  return { score, role, reason: reason || "Source file" };
}

// Backwards-compatible helper
export function scoreFile(path: string): number {
  return classifyFile(path).score;
}
