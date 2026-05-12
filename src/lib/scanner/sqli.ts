import { lineOf, takeSnippet, type RawFinding, type Scanner } from "./types";

/**
 * SQLi Hunter rules: detect string interpolation/concatenation into SQL sinks.
 * Covers JS/TS, Python, PHP, Java, Go.
 */

type Rule = {
  re: RegExp;
  category: "SQLI";
  cwe: string;
  title: string;
  description: string;
  severity: "CRITICAL" | "HIGH";
  langs: string[];
  confidence?: number;
};

const RULES: Rule[] = [
  {
    re: /\b(?:query|execute|raw|exec|prepare)\s*\(\s*[`"'][^`"']*\$\{[^}]+\}[^`"']*[`"']\s*\)/g,
    category: "SQLI",
    cwe: "CWE-89",
    title: "Template-literal SQL with interpolated input",
    description:
      "A SQL string is built using template-literal interpolation directly inside a query/execute call. " +
      "If any interpolated value originates from user input, this enables SQL injection. " +
      "Use parameterised queries / prepared statements instead.",
    severity: "CRITICAL",
    langs: ["javascript", "typescript", "tsx", "jsx"]
  },
  {
    re: /\b(?:query|execute|raw|exec)\s*\(\s*["'][^"']*["']\s*\+\s*[A-Za-z_][\w.[\]]*\s*\+/g,
    category: "SQLI",
    cwe: "CWE-89",
    title: "String concatenation into SQL sink",
    description:
      "User-controlled values are concatenated into a SQL statement passed to a database driver. " +
      "Always pass values as parameters rather than building the SQL string manually.",
    severity: "CRITICAL",
    langs: ["javascript", "typescript", "tsx", "jsx", "java", "csharp"]
  },
  {
    re: /\bcursor\.execute\s*\(\s*["'][^"']*%[sd][^"']*["']\s*%\s*[A-Za-z_][\w.[\]]*\s*\)/g,
    category: "SQLI",
    cwe: "CWE-89",
    title: "Python `%` formatting inside cursor.execute",
    description:
      "Python DB-API supports parameterisation natively. Using `%`-formatting inserts user input directly into the SQL string and is unsafe.",
    severity: "CRITICAL",
    langs: ["python"]
  },
  {
    re: /\bf["'][^"']*SELECT[^"']*\{[^}]+\}[^"']*["']/gi,
    category: "SQLI",
    cwe: "CWE-89",
    title: "Python f-string SQL with interpolation",
    description:
      "Building SQL with f-strings makes it trivial to inject malicious input. Switch to driver placeholders (?, %s, $1).",
    severity: "HIGH",
    langs: ["python"]
  },
  {
    re: /\bmysqli_query\s*\([^,]+,\s*["'][^"']*["']\s*\.\s*\$[A-Za-z_]/g,
    category: "SQLI",
    cwe: "CWE-89",
    title: "PHP mysqli_query with string concatenation",
    description:
      "PHP code concatenates a `$variable` directly into a SQL query. Use prepared statements with `mysqli_prepare`.",
    severity: "CRITICAL",
    langs: ["php"]
  },
  {
    re: /\bdb\.Query\s*\(\s*"[^"]*"\s*\+\s*[A-Za-z_]/g,
    category: "SQLI",
    cwe: "CWE-89",
    title: "Go db.Query with string concatenation",
    description:
      "`database/sql` supports placeholders. Avoid `db.Query(\"SELECT ... \" + userInput)` and use `db.Query(\"... = ?\", userInput)`.",
    severity: "CRITICAL",
    langs: ["go"]
  }
];

export const sqliScanner: Scanner = (file) => {
  const findings: RawFinding[] = [];
  const lang = (file.language || "").toLowerCase();
  for (const rule of RULES) {
    if (!rule.langs.includes(lang) && rule.langs.length) continue;
    let m: RegExpExecArray | null;
    rule.re.lastIndex = 0;
    while ((m = rule.re.exec(file.content)) !== null) {
      const line = lineOf(file.content, m.index);
      findings.push({
        agent: "sqli-hunter",
        category: rule.category,
        severity: rule.severity,
        cwe: rule.cwe,
        title: rule.title,
        description: rule.description,
        filePath: file.path,
        line,
        snippet: takeSnippet(file.content, line, 2),
        confidence: rule.confidence ?? 0.85
      });
      if (m.index === rule.re.lastIndex) rule.re.lastIndex++;
    }
  }
  return findings;
};
