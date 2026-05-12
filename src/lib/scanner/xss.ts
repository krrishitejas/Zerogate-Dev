import { lineOf, takeSnippet, type RawFinding, type Scanner } from "./types";

type Rule = {
  re: RegExp;
  cwe: string;
  title: string;
  description: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM";
  langs: string[];
};

const RULES: Rule[] = [
  {
    re: /\.innerHTML\s*=\s*[^;]+/g,
    cwe: "CWE-79",
    title: "Direct innerHTML assignment",
    description:
      "Assigning untrusted data to `.innerHTML` allows arbitrary HTML/JS injection. " +
      "Use `.textContent` or a sanitiser like DOMPurify before injecting markup.",
    severity: "HIGH",
    langs: ["javascript", "typescript", "tsx", "jsx", "html"]
  },
  {
    re: /dangerouslySetInnerHTML\s*=\s*\{\s*\{\s*__html\s*:/g,
    cwe: "CWE-79",
    title: "React dangerouslySetInnerHTML",
    description:
      "React's `dangerouslySetInnerHTML` bypasses XSS protection. Ensure the HTML is sanitised server-side or with DOMPurify.",
    severity: "HIGH",
    langs: ["javascript", "typescript", "tsx", "jsx"]
  },
  {
    re: /document\.write\s*\(/g,
    cwe: "CWE-79",
    title: "document.write usage",
    description:
      "`document.write` writes raw markup, often using untrusted input. Refactor to safe DOM APIs.",
    severity: "MEDIUM",
    langs: ["javascript", "typescript"]
  },
  {
    re: /\beval\s*\(/g,
    cwe: "CWE-95",
    title: "eval() usage",
    description:
      "`eval()` executes arbitrary code and is one of the strongest signals of code-injection / XSS. Replace with explicit parsing.",
    severity: "CRITICAL",
    langs: ["javascript", "typescript", "tsx", "jsx", "python"]
  },
  {
    re: /res\.send\s*\(\s*[`"'][^`"']*\$\{[^}]+\}/g,
    cwe: "CWE-79",
    title: "Server response with interpolated HTML",
    description:
      "Express-style response interpolates a variable into raw HTML. Escape the value or render via a templating engine.",
    severity: "HIGH",
    langs: ["javascript", "typescript"]
  },
  {
    re: /\{!!\s*[A-Za-z_][\w.]*\s*!!\}/g, // Vue/Blade-style raw output
    cwe: "CWE-79",
    title: "Unescaped template output",
    description:
      "Templating engine emits a raw, unescaped variable directly into the page. This is a classic XSS sink.",
    severity: "HIGH",
    langs: ["html", "vue", "php", "blade"]
  }
];

export const xssScanner: Scanner = (file) => {
  const findings: RawFinding[] = [];
  const lang = (file.language || "").toLowerCase();
  for (const rule of RULES) {
    if (rule.langs.length && !rule.langs.includes(lang)) continue;
    let m: RegExpExecArray | null;
    rule.re.lastIndex = 0;
    while ((m = rule.re.exec(file.content)) !== null) {
      const line = lineOf(file.content, m.index);
      findings.push({
        agent: "xss-defender",
        category: "XSS",
        severity: rule.severity,
        cwe: rule.cwe,
        title: rule.title,
        description: rule.description,
        filePath: file.path,
        line,
        snippet: takeSnippet(file.content, line, 2),
        confidence: 0.8
      });
      if (m.index === rule.re.lastIndex) rule.re.lastIndex++;
    }
  }
  return findings;
};
