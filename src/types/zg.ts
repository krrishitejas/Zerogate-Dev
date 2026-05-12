// Shared enum-like types. SQLite doesn't support Prisma enums, so we keep
// these as TS-level string literal unions and store strings in the database.

export type Plan = "FREE" | "PRO" | "MAX";
export const PLAN_VALUES = ["FREE", "PRO", "MAX"] as const;

export type Source = "GITHUB" | "ZIP" | "FORK";

export type ProjectStatus =
  | "IDLE"
  | "IMPORTING"
  | "ANALYZING"
  | "SCANNING"
  | "REMEDIATING"
  | "REPORTING"
  | "READY"
  | "ERROR";

export type ScanStatus = "PENDING" | "RUNNING" | "COMPLETED" | "FAILED";

export type Category =
  | "SQLI"
  | "XSS"
  | "SECRETS"
  | "AUTH"
  | "CRYPTO"
  | "DEPENDENCY"
  | "PATH_TRAVERSAL"
  | "SSRF"
  | "CSRF"
  | "COMMAND_INJECTION"
  | "INSECURE_DESERIALIZATION"
  | "RACE_CONDITION"
  | "MISC";

export type Severity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFO";
export const SEVERITY_RANK: Record<Severity, number> = {
  CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3, INFO: 4
};

export type FindingStatus = "OPEN" | "FIXED" | "IGNORED" | "REVIEW";
