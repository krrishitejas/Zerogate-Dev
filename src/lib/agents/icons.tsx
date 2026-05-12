import {
  Download,
  Map,
  Database,
  Code2,
  KeyRound,
  Package,
  Lock,
  Compass,
  Wand2,
  FileText,
  FileSpreadsheet,
  GitPullRequest,
  type LucideIcon
} from "lucide-react";

/**
 * Agent ID → Lucide line icon.
 * Used by the marketing pages and dashboard to render minimal SVG icons
 * in place of emojis.
 */
export const AGENT_ICONS: Record<string, LucideIcon> = {
  "repo-importer":      Download,
  "code-cartographer":  Map,
  "sqli-hunter":        Database,
  "xss-defender":       Code2,
  "secret-sentinel":    KeyRound,
  "dependency-auditor": Package,
  "auth-crypto":        Lock,
  "ssrf-path":          Compass,
  "fix-synthesizer":    Wand2,
  "report-composer":    FileText,
  "export-engineer":    FileSpreadsheet,
  "deployment-conductor": GitPullRequest
};

export function agentIcon(id: string): LucideIcon {
  return AGENT_ICONS[id] ?? Code2;
}
