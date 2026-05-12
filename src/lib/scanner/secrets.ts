import { lineOf, takeSnippet, type RawFinding, type Scanner } from "./types";

type SecretRule = {
  name: string;
  re: RegExp;
  severity: "CRITICAL" | "HIGH";
  cwe: string;
};

const RULES: SecretRule[] = [
  { name: "AWS Access Key ID",         re: /\bAKIA[0-9A-Z]{16}\b/g,                               severity: "CRITICAL", cwe: "CWE-798" },
  { name: "AWS Secret Access Key",     re: /(?<![A-Za-z0-9])[A-Za-z0-9/+]{40}(?![A-Za-z0-9])/g,   severity: "HIGH",     cwe: "CWE-798" },
  { name: "Google API Key",            re: /\bAIza[0-9A-Za-z\-_]{35}\b/g,                          severity: "CRITICAL", cwe: "CWE-798" },
  { name: "GitHub Token (classic)",    re: /\bghp_[A-Za-z0-9]{36}\b/g,                             severity: "CRITICAL", cwe: "CWE-798" },
  { name: "GitHub Fine-grained Token", re: /\bgithub_pat_[A-Za-z0-9_]{82}\b/g,                     severity: "CRITICAL", cwe: "CWE-798" },
  { name: "Slack Token",               re: /\bxox[abprs]-[A-Za-z0-9-]{10,}\b/g,                    severity: "CRITICAL", cwe: "CWE-798" },
  { name: "Stripe Secret Key",         re: /\b(?:sk|rk)_(?:live|test)_[A-Za-z0-9]{20,}\b/g,        severity: "CRITICAL", cwe: "CWE-798" },
  { name: "OpenAI API Key",            re: /\bsk-(?:proj-)?[A-Za-z0-9_\-]{20,}\b/g,                severity: "CRITICAL", cwe: "CWE-798" },
  { name: "Anthropic API Key",         re: /\bsk-ant-[A-Za-z0-9_\-]{20,}\b/g,                      severity: "CRITICAL", cwe: "CWE-798" },
  { name: "JWT Token",                 re: /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g, severity: "HIGH",  cwe: "CWE-798" },
  { name: "Generic Password Assignment", re: /\b(?:password|passwd|pwd)\s*[:=]\s*["'][^"'\s]{6,}["']/gi, severity: "HIGH", cwe: "CWE-798" },
  { name: "Generic API Key Assignment",  re: /\b(?:api[_-]?key|secret|token)\s*[:=]\s*["'][A-Za-z0-9_\-]{20,}["']/gi, severity: "HIGH", cwe: "CWE-798" },
  { name: "Private Key PEM",           re: /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/g, severity: "CRITICAL", cwe: "CWE-798" }
];

const IGNORED_PATHS = [/(^|\/)node_modules\//, /(^|\/)vendor\//, /\.lock$/, /\.min\.js$/];

export const secretsScanner: Scanner = (file) => {
  if (IGNORED_PATHS.some((r) => r.test(file.path))) return [];

  const findings: RawFinding[] = [];
  for (const rule of RULES) {
    let m: RegExpExecArray | null;
    rule.re.lastIndex = 0;
    while ((m = rule.re.exec(file.content)) !== null) {
      // For very generic AWS-secret style rule, require a hint nearby to lower FP
      if (rule.name === "AWS Secret Access Key") {
        const around = file.content.slice(Math.max(0, m.index - 80), m.index + 80);
        if (!/aws|secret|access/i.test(around)) {
          if (m.index === rule.re.lastIndex) rule.re.lastIndex++;
          continue;
        }
      }
      const line = lineOf(file.content, m.index);
      findings.push({
        agent: "secret-sentinel",
        category: "SECRETS",
        severity: rule.severity,
        cwe: rule.cwe,
        title: `Hardcoded ${rule.name}`,
        description:
          `A literal that matches the pattern of a ${rule.name} was found committed in the source file. ` +
          "Move secrets to environment variables or a secret manager and rotate the exposed credential immediately.",
        filePath: file.path,
        line,
        snippet: takeSnippet(file.content, line, 1).replace(m[0], `${m[0].slice(0, 6)}…REDACTED…${m[0].slice(-4)}`),
        confidence: 0.95
      });
      if (m.index === rule.re.lastIndex) rule.re.lastIndex++;
    }
  }
  return findings;
};
