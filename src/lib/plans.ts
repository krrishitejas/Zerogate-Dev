import type { Plan } from "@/types/zg";
export type { Plan } from "@/types/zg";

export type PlanLimits = {
  maxProjects: number;
  maxFilesPerProject: number;
  maxRepoSizeMB: number;
  maxScansPerMonth: number;
  agents: string[];
  features: string[];
  supportLevel: "community" | "priority" | "dedicated";
  realtimeWatch: boolean;
  pushToGithub: boolean;
};

export const PLAN_LIMITS: Record<Plan, PlanLimits> = {
  FREE: {
    maxProjects: 2,
    maxFilesPerProject: 250,
    maxRepoSizeMB: 25,
    maxScansPerMonth: 20,
    agents: [
      "Repo Importer",
      "Code Cartographer",
      "SQLi Hunter",
      "XSS Defender",
      "Report Composer"
    ],
    features: [
      "Public GitHub repos",
      "ZIP upload up to 25 MB",
      "Markdown reports"
    ],
    supportLevel: "community",
    realtimeWatch: false,
    pushToGithub: false
  },
  PRO: {
    maxProjects: 25,
    maxFilesPerProject: 5000,
    maxRepoSizeMB: 250,
    maxScansPerMonth: 500,
    agents: [
      "Repo Importer",
      "Code Cartographer",
      "SQLi Hunter",
      "XSS Defender",
      "Secret Sentinel",
      "Dependency Auditor",
      "Fix Synthesizer",
      "Report Composer",
      "Export Engineer"
    ],
    features: [
      "Private GitHub repos & forks",
      "Real-time code watch",
      "Auto-fix with regenerate",
      "CSV / XLSX exports",
      "Push fixes to GitHub"
    ],
    supportLevel: "priority",
    realtimeWatch: true,
    pushToGithub: true
  },
  MAX: {
    maxProjects: 999,
    maxFilesPerProject: 100000,
    maxRepoSizeMB: 5000,
    maxScansPerMonth: 100000,
    agents: [
      "Repo Importer",
      "Code Cartographer",
      "SQLi Hunter",
      "XSS Defender",
      "Secret Sentinel",
      "Dependency Auditor",
      "Auth & Crypto Inspector",
      "SSRF / Path-Traversal Sentinel",
      "Fix Synthesizer",
      "Report Composer",
      "Export Engineer",
      "Deployment Conductor"
    ],
    features: [
      "Unlimited orgs & monorepos",
      "All 12 specialized agents",
      "Real-time watch + autonomous remediation",
      "Custom rules / suppression lists",
      "SAML SSO + audit log",
      "Dedicated support engineer"
    ],
    supportLevel: "dedicated",
    realtimeWatch: true,
    pushToGithub: true
  }
};

export const PLAN_PRICING: Record<
  Plan,
  {
    monthly: number;
    annual: number;
    /** INR price, used in the dashboard /billing surface. */
    monthlyInr: number;
    annualInr: number;
    tagline: string;
    cta: string;
  }
> = {
  FREE: {
    monthly: 0,
    annual: 0,
    monthlyInr: 0,
    annualInr: 0,
    tagline: "For curious developers exploring ZEROGATE.",
    cta: "Start free"
  },
  PRO: {
    monthly: 39,
    annual: 390,
    monthlyInr: 2999,
    annualInr: 29990,
    tagline: "For shipping teams that take security seriously.",
    cta: "Start Pro trial"
  },
  MAX: {
    monthly: 149,
    annual: 1490,
    monthlyInr: 11999,
    annualInr: 119990,
    tagline: "For organizations that need autonomous defense.",
    cta: "Talk to sales"
  }
};

export function formatInr(n: number): string {
  if (n === 0) return "₹0";
  return `₹${n.toLocaleString("en-IN")}`;
}

export function planRank(plan: Plan): number {
  return plan === "FREE" ? 0 : plan === "PRO" ? 1 : 2;
}

export function canUseAgent(plan: Plan, agent: string) {
  return PLAN_LIMITS[plan].agents.includes(agent);
}
