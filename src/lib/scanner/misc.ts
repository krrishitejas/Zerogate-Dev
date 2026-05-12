import { lineOf, takeSnippet, type RawFinding, type Scanner } from "./types";

/* ───────────────────────── Auth & Crypto Inspector ─────────────────────── */
export const authCryptoScanner: Scanner = (file) => {
  const findings: RawFinding[] = [];
  const lang = (file.language || "").toLowerCase();
  const tests: { re: RegExp; severity: "CRITICAL" | "HIGH" | "MEDIUM"; title: string; description: string; cwe: string; category: "AUTH" | "CRYPTO" }[] = [
    {
      re: /\b(?:md5|sha1)\s*\(/gi,
      severity: "HIGH",
      cwe: "CWE-327",
      category: "CRYPTO",
      title: "Weak hash function (MD5/SHA-1)",
      description: "MD5 and SHA-1 are cryptographically broken. Use SHA-256+, bcrypt/argon2 for passwords, or HMAC-SHA-256."
    },
    {
      re: /\bjwt\.verify\s*\([^,]+,[^,]+,\s*\{\s*algorithms\s*:\s*\[\s*["']none["']\s*\]/g,
      severity: "CRITICAL",
      cwe: "CWE-347",
      category: "AUTH",
      title: "JWT 'none' algorithm allowed",
      description: "Allowing the `none` algorithm lets attackers forge tokens. Pin a specific algorithm such as HS256 or RS256."
    },
    {
      re: /\bjwt\.(?:sign|verify)\s*\(\s*[^,]+,\s*["'][^"']{0,16}["']/g,
      severity: "HIGH",
      cwe: "CWE-798",
      category: "AUTH",
      title: "Hardcoded short JWT secret",
      description: "JWT secrets must be high-entropy and stored in environment configuration, not hardcoded as short strings."
    },
    {
      re: /createCipheriv\s*\(\s*["']aes-\d{3}-ecb["']/gi,
      severity: "HIGH",
      cwe: "CWE-327",
      category: "CRYPTO",
      title: "AES-ECB used (insecure mode)",
      description: "ECB mode leaks plaintext patterns. Use AES-GCM (preferred) or AES-CBC with random IVs and HMAC."
    },
    {
      re: /Math\.random\s*\(\s*\)[^;]*(?:token|password|secret|key)/gi,
      severity: "HIGH",
      cwe: "CWE-330",
      category: "CRYPTO",
      title: "Math.random used for security context",
      description: "`Math.random` is not cryptographically secure. Use `crypto.randomBytes` / `crypto.getRandomValues`."
    }
  ];

  for (const t of tests) {
    if (lang === "" || ["javascript","typescript","tsx","jsx","python","java","csharp","go","php"].includes(lang)) {
      let m: RegExpExecArray | null;
      t.re.lastIndex = 0;
      while ((m = t.re.exec(file.content)) !== null) {
        const line = lineOf(file.content, m.index);
        findings.push({
          agent: "auth-crypto",
          category: t.category,
          severity: t.severity,
          cwe: t.cwe,
          title: t.title,
          description: t.description,
          filePath: file.path,
          line,
          snippet: takeSnippet(file.content, line, 2),
          confidence: 0.85
        });
        if (m.index === t.re.lastIndex) t.re.lastIndex++;
      }
    }
  }
  return findings;
};

/* ───────────────────── SSRF / Path-Traversal / Command Injection ─────────── */
export const ssrfPathScanner: Scanner = (file) => {
  const findings: RawFinding[] = [];
  const lang = (file.language || "").toLowerCase();

  const tests: { re: RegExp; severity: "CRITICAL" | "HIGH" | "MEDIUM"; title: string; description: string; cwe: string; category: "SSRF" | "PATH_TRAVERSAL" | "COMMAND_INJECTION" }[] = [
    {
      re: /\bfetch\s*\(\s*[A-Za-z_][\w.[\]]*\s*\)/g,
      severity: "MEDIUM",
      cwe: "CWE-918",
      category: "SSRF",
      title: "Server-side fetch with variable URL",
      description: "If the URL passed to `fetch` originates from user input, the server may be coerced into requesting internal resources. Validate against an allowlist."
    },
    {
      re: /\bfs\.(?:readFile|writeFile|unlink|createReadStream)(?:Sync)?\s*\(\s*[A-Za-z_][\w.[\]]*\s*[\),]/g,
      severity: "HIGH",
      cwe: "CWE-22",
      category: "PATH_TRAVERSAL",
      title: "Filesystem call with variable path",
      description: "Untrusted input flowing to `fs.*` enables path traversal. Resolve and verify the path is inside an allowed base directory."
    },
    {
      re: /\b(?:child_process\.exec|exec|execSync|spawn)\s*\(\s*[A-Za-z_][\w.[\]]*\s*[\),]/g,
      severity: "CRITICAL",
      cwe: "CWE-78",
      category: "COMMAND_INJECTION",
      title: "Shell exec with variable argument",
      description: "Passing user input to a shell exec call is OS-command injection. Use argument arrays with `spawn(cmd, [args])` and validate inputs."
    },
    {
      re: /\bos\.system\s*\(\s*[A-Za-z_][\w.[\]]*\s*\)/g,
      severity: "CRITICAL",
      cwe: "CWE-78",
      category: "COMMAND_INJECTION",
      title: "Python os.system with variable",
      description: "`os.system` executes a shell. Pass arguments via `subprocess.run([...], shell=False)`."
    }
  ];

  for (const t of tests) {
    if (lang && !["javascript","typescript","tsx","jsx","python","go","ruby","php"].includes(lang)) continue;
    let m: RegExpExecArray | null;
    t.re.lastIndex = 0;
    while ((m = t.re.exec(file.content)) !== null) {
      const line = lineOf(file.content, m.index);
      findings.push({
        agent: "ssrf-path",
        category: t.category,
        severity: t.severity,
        cwe: t.cwe,
        title: t.title,
        description: t.description,
        filePath: file.path,
        line,
        snippet: takeSnippet(file.content, line, 2),
        confidence: 0.7
      });
      if (m.index === t.re.lastIndex) t.re.lastIndex++;
    }
  }
  return findings;
};

/* ───────────────────────── Dependency Auditor ──────────────────────────── */
const VULN_PACKAGES: { name: string; bad: RegExp; cve: string; severity: "CRITICAL" | "HIGH" | "MEDIUM"; note: string }[] = [
  { name: "lodash",   bad: /^(?:[0-3]\.|4\.0\.|4\.1[0-6]\.)/, cve: "CVE-2019-10744", severity: "HIGH",     note: "Prototype pollution. Upgrade to >=4.17.21." },
  { name: "minimist", bad: /^(?:0\.|1\.[01]\.)/,              cve: "CVE-2020-7598",  severity: "MEDIUM",   note: "Prototype pollution. Upgrade to >=1.2.6." },
  { name: "moment",   bad: /^(?:2\.[0-9]\.|2\.1[0-9]\.|2\.2[0-8]\.)/, cve: "CVE-2022-31129", severity: "HIGH", note: "ReDoS in moment. Upgrade to >=2.29.4 or migrate to date-fns/luxon." },
  { name: "express",  bad: /^(?:[0-3]\.)/,                    cve: "CVE-2022-24999", severity: "MEDIUM",   note: "qs prototype pollution. Upgrade to express >=4.17.3." },
  { name: "axios",    bad: /^(?:0\.[0-9]\.|0\.1[0-9]\.|0\.2[0-5]\.)/, cve: "CVE-2023-45857", severity: "HIGH", note: "CSRF via cookie leakage. Upgrade to axios >=1.6.0." },
  { name: "next",     bad: /^(?:[0-9]\.|1[0-2]\.)/,           cve: "CVE-2024-34351", severity: "HIGH",     note: "SSRF in next/image. Upgrade to >=13.5.4." },
  { name: "ws",       bad: /^(?:[0-6]\.|7\.[0-4]\.)/,         cve: "CVE-2024-37890", severity: "HIGH",     note: "DoS via header. Upgrade to >=8.17.1." }
];

export const dependencyScanner: Scanner = (file) => {
  const findings: RawFinding[] = [];

  if (/(^|\/)package\.json$/.test(file.path)) {
    try {
      const pkg = JSON.parse(file.content);
      const all = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
      for (const [name, raw] of Object.entries(all)) {
        const version = String(raw).replace(/^[\^~>=<\s]+/, "");
        const rule = VULN_PACKAGES.find((v) => v.name === name);
        if (rule && rule.bad.test(version)) {
          // Try to locate the line in the file
          const idx = file.content.indexOf(`"${name}"`);
          const line = idx >= 0 ? lineOf(file.content, idx) : 1;
          findings.push({
            agent: "dependency-auditor",
            category: "DEPENDENCY",
            severity: rule.severity,
            cwe: "CWE-1104",
            title: `${name}@${version} is vulnerable (${rule.cve})`,
            description: rule.note,
            filePath: file.path,
            line,
            snippet: takeSnippet(file.content, line, 1),
            confidence: 0.95
          });
        }
      }
    } catch {
      // ignore malformed package.json
    }
  }

  if (/(^|\/)requirements\.txt$/.test(file.path)) {
    file.content.split(/\r?\n/).forEach((raw, i) => {
      const m = raw.trim().match(/^([A-Za-z0-9_.\-]+)\s*==\s*([0-9][0-9A-Za-z.\-]*)/);
      if (!m) return;
      const [_, name, version] = m;
      const rule = VULN_PACKAGES.find((v) => v.name === name);
      if (rule && rule.bad.test(version)) {
        findings.push({
          agent: "dependency-auditor",
          category: "DEPENDENCY",
          severity: rule.severity,
          cwe: "CWE-1104",
          title: `${name}==${version} is vulnerable (${rule.cve})`,
          description: rule.note,
          filePath: file.path,
          line: i + 1,
          snippet: raw,
          confidence: 0.9
        });
      }
    });
  }

  return findings;
};
