// Lightweight language detection by file extension / filename.

const EXT_MAP: Record<string, string> = {
  ts: "typescript", tsx: "tsx", js: "javascript", jsx: "jsx", mjs: "javascript", cjs: "javascript",
  py: "python", rb: "ruby", php: "php",
  java: "java", kt: "kotlin", scala: "scala", groovy: "groovy",
  go: "go", rs: "rust", c: "c", h: "c", cpp: "cpp", cc: "cpp", cxx: "cpp", hpp: "cpp",
  cs: "csharp", fs: "fsharp", swift: "swift", m: "objective-c", mm: "objective-c",
  sh: "shell", bash: "shell", zsh: "shell", fish: "shell",
  yml: "yaml", yaml: "yaml", json: "json", toml: "toml", ini: "ini", env: "env",
  html: "html", htm: "html", vue: "vue", svelte: "svelte",
  css: "css", scss: "scss", sass: "sass", less: "less",
  md: "markdown", mdx: "markdown",
  sql: "sql", graphql: "graphql", gql: "graphql",
  dockerfile: "dockerfile",
  tf: "terraform", hcl: "terraform"
};

const FILENAME_MAP: Record<string, string> = {
  Dockerfile: "dockerfile",
  Makefile: "make",
  Procfile: "procfile",
  ".env": "env",
  ".env.local": "env",
  ".env.production": "env",
  ".env.development": "env"
};

export function detectLanguage(path: string): string | null {
  const file = path.split("/").pop() || path;
  if (FILENAME_MAP[file]) return FILENAME_MAP[file];
  // Multi-dot filenames: pick last segment as ext
  const ext = file.includes(".") ? file.split(".").pop()! : "";
  return EXT_MAP[ext.toLowerCase()] ?? null;
}

export function isHidden(path: string): boolean {
  // Any segment starts with "."
  return path.split("/").some((seg) => seg.startsWith(".") && seg !== "." && seg !== "..");
}

export function countLOC(content: string): number {
  if (!content) return 0;
  return content.split(/\r?\n/).length;
}
