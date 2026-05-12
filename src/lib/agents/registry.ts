import type { Category } from "@/types/zg";

export type AgentMeta = {
  id: string;
  name: string;
  role: string;
  /** One-line summary used on the marketing page. Keep under ~70 chars. */
  summary: string;
  description: string;
  emoji: string;
  color: string;
  capabilities: string[];
  categories?: Category[];
  /** Unlocked from this plan and above */
  minPlan: "FREE" | "PRO" | "MAX";
};

/**
 * The full ZEROGATE swarm. Each agent is a single-purpose specialist.
 * The orchestrator activates them in phases: import → analyze → scan → fix → report → export → deploy.
 */
export const AGENTS: AgentMeta[] = [
  {
    id: "repo-importer",
    name: "Repo Importer",
    role: "Ingestion",
    summary: "Pulls any GitHub repo, fork, or ZIP into the workspace.",
    description:
      "Pulls a GitHub repository, fork, or ZIP archive into ZEROGATE. Normalises file metadata, language, and hidden files.",
    emoji: "📥",
    color: "from-violet-500 to-fuchsia-500",
    capabilities: ["GitHub OAuth", "Octokit tree", "ZIP extraction", "Hidden-file aware"],
    minPlan: "FREE"
  },
  {
    id: "code-cartographer",
    name: "Code Cartographer",
    role: "Analysis",
    summary: "Indexes every file and maps your stack for the swarm.",
    description:
      "Reads every file, infers stack and entrypoints, and builds a RAG index of the project for downstream agents.",
    emoji: "🗺️",
    color: "from-cyan-400 to-sky-500",
    capabilities: ["Stack inference", "RAG embedding", "Entrypoint detection", "Real-time watch"],
    minPlan: "FREE"
  },
  {
    id: "sqli-hunter",
    name: "SQLi Hunter",
    role: "Vulnerability",
    summary: "Finds SQL injection in raw queries and ORM escapes.",
    description:
      "Detects SQL injection via tainted-source tracing and dialect-aware sinks across raw queries and ORM escapes.",
    emoji: "🛢️",
    color: "from-rose-500 to-orange-500",
    capabilities: ["Taint analysis", "Multi-dialect rules", "ORM-aware", "Confidence scoring"],
    categories: ["SQLI"],
    minPlan: "FREE"
  },
  {
    id: "xss-defender",
    name: "XSS Defender",
    role: "Vulnerability",
    summary: "Catches reflected, stored, and DOM-based XSS.",
    description:
      "Hunts reflected, stored, and DOM-based XSS in JS/TS, JSX, templates, and server-rendered output.",
    emoji: "🪞",
    color: "from-amber-400 to-rose-500",
    capabilities: ["DOM sinks", "innerHTML / dangerouslySetInnerHTML", "Template scanning"],
    categories: ["XSS"],
    minPlan: "FREE"
  },
  {
    id: "secret-sentinel",
    name: "Secret Sentinel",
    role: "Vulnerability",
    summary: "Detects hardcoded keys, tokens, and high-entropy secrets.",
    description:
      "Spots hardcoded API keys, tokens, certificates, and high-entropy secrets across all files (including hidden).",
    emoji: "🔐",
    color: "from-lime-400 to-emerald-500",
    capabilities: ["Entropy scanning", "Provider-specific patterns", "Dotfile aware"],
    categories: ["SECRETS"],
    minPlan: "PRO"
  },
  {
    id: "dependency-auditor",
    name: "Dependency Auditor",
    role: "Vulnerability",
    summary: "Flags vulnerable packages in your lockfiles.",
    description:
      "Audits package.json / requirements.txt / go.mod / pom.xml against known-vulnerable version patterns.",
    emoji: "📦",
    color: "from-blue-400 to-indigo-500",
    capabilities: ["Lockfile parsing", "Vuln signature matching", "License flags"],
    categories: ["DEPENDENCY"],
    minPlan: "PRO"
  },
  {
    id: "auth-crypto",
    name: "Auth & Crypto Inspector",
    role: "Vulnerability",
    summary: "Audits JWTs, sessions, and weak cryptography.",
    description:
      "Reviews authentication flows, JWT usage, session handling, and weak cryptography (MD5/SHA1, ECB, hardcoded IVs).",
    emoji: "🛡️",
    color: "from-fuchsia-500 to-purple-500",
    capabilities: ["JWT review", "Hash audit", "Session policy", "Insecure crypto detection"],
    categories: ["AUTH", "CRYPTO"],
    minPlan: "MAX"
  },
  {
    id: "ssrf-path",
    name: "SSRF / Path-Traversal Sentinel",
    role: "Vulnerability",
    summary: "Spots SSRF, path traversal, and command injection.",
    description:
      "Detects request forgery, path traversal, and command injection across server-side request and FS operations.",
    emoji: "🧭",
    color: "from-orange-500 to-rose-500",
    capabilities: ["URL fetch sinks", "FS path joins", "Shell exec scanning"],
    categories: ["SSRF", "PATH_TRAVERSAL", "COMMAND_INJECTION"],
    minPlan: "MAX"
  },
  {
    id: "fix-synthesizer",
    name: "Fix Synthesizer",
    role: "Remediation",
    summary: "Writes a minimal patch for every finding it gets.",
    description:
      "Proposes minimally-invasive, framework-aware patches for any finding. Supports 'regenerate' until you approve.",
    emoji: "🧬",
    color: "from-emerald-400 to-cyan-500",
    capabilities: ["Context-aware patches", "Multi-iteration", "Diff explanations"],
    minPlan: "PRO"
  },
  {
    id: "report-composer",
    name: "Report Composer",
    role: "Reporting",
    summary: "Writes a clean markdown report of every finding.",
    description:
      "Authors an executive markdown report with vulnerability descriptions, fixes applied, and residual risk.",
    emoji: "📝",
    color: "from-sky-400 to-violet-500",
    capabilities: ["Executive summaries", "Per-finding deep dives", "Remediation timelines"],
    minPlan: "FREE"
  },
  {
    id: "export-engineer",
    name: "Export Engineer",
    role: "Reporting",
    summary: "Exports findings to CSV and XLSX for compliance.",
    description:
      "Produces formatted CSV and XLSX downloads of every finding, fix, and audit step for compliance teams.",
    emoji: "📊",
    color: "from-teal-400 to-emerald-500",
    capabilities: ["CSV", "XLSX with styling", "Compliance-friendly columns"],
    minPlan: "PRO"
  },
  {
    id: "deployment-conductor",
    name: "Deployment Conductor",
    role: "Delivery",
    summary: "Opens a pull request with the patch on a clean branch.",
    description:
      "Pushes the patched project back to GitHub on a fix branch with PR-ready commit messages, or hands you a clean ZIP.",
    emoji: "🚀",
    color: "from-violet-500 to-cyan-400",
    capabilities: ["Branch + commit", "PR description", "Signed commits", "ZIP export"],
    minPlan: "PRO"
  }
];

export function agentById(id: string) {
  return AGENTS.find((a) => a.id === id);
}
