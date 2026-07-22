import type { BundledLanguage } from "shiki";

const EXT_TO_LANG: Record<string, BundledLanguage> = {
  ts: "typescript",
  tsx: "tsx",
  js: "javascript",
  jsx: "jsx",
  mjs: "javascript",
  cjs: "javascript",
  py: "python",
  rb: "ruby",
  go: "go",
  rs: "rust",
  java: "java",
  kt: "kotlin",
  kts: "kotlin",
  swift: "swift",
  cs: "csharp",
  cpp: "cpp",
  cc: "cpp",
  cxx: "cpp",
  c: "c",
  h: "c",
  hpp: "cpp",
  php: "php",
  sql: "sql",
  sh: "bash",
  bash: "bash",
  zsh: "bash",
  yml: "yaml",
  yaml: "yaml",
  json: "json",
  jsonc: "jsonc",
  toml: "toml",
  md: "markdown",
  mdx: "mdx",
  css: "css",
  scss: "scss",
  less: "less",
  html: "html",
  htm: "html",
  vue: "vue",
  svelte: "svelte",
  graphql: "graphql",
  gql: "graphql",
  dockerfile: "dockerfile",
  xml: "xml",
  svg: "xml",
  prisma: "prisma",
  proto: "protobuf",
  r: "r",
  lua: "lua",
  dart: "dart",
  zig: "zig",
  gradle: "groovy",
};

const SPECIAL_BASENAMES: Record<string, BundledLanguage> = {
  dockerfile: "dockerfile",
  makefile: "makefile",
  gemfile: "ruby",
  rakefile: "ruby",
  "cargo.toml": "toml",
  "pyproject.toml": "toml",
  "go.mod": "go",
  "go.sum": "go",
};

/** Map a repo file path to a Shiki language id, or null if unknown. */
export function languageFromPath(path: string): BundledLanguage | null {
  const basename = path.split("/").pop()?.toLowerCase() ?? "";
  if (SPECIAL_BASENAMES[basename]) return SPECIAL_BASENAMES[basename];

  const ext = basename.includes(".") ? basename.split(".").pop()! : "";
  if (ext && EXT_TO_LANG[ext]) return EXT_TO_LANG[ext];

  // Double extensions like .gradle.kts already handled via kts
  return null;
}

export function languageLabel(path: string): string {
  const lang = languageFromPath(path);
  if (!lang) return "text";
  return lang;
}
