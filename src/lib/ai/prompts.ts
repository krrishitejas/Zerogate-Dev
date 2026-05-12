// Centralized prompt templates for ZEROGATE agents.

export const SYSTEM_BASE = `You are ZEROGATE, a multi-agent code-security platform.
You assist software developers by analyzing their projects for vulnerabilities and producing precise, actionable fixes.
Always be technically rigorous, cite file paths and line numbers, never invent code that doesn't fit the project's language and frameworks.
Be concise. Prefer JSON when the user asks for it. Never produce markdown fences inside JSON values.`;

export function explainFindingPrompt(args: {
  category: string;
  filePath: string;
  language?: string;
  snippet: string;
  framework?: string;
}) {
  return `Explain the following ${args.category} finding for a senior engineer.

File: ${args.filePath}
Language: ${args.language ?? "unknown"}
Framework: ${args.framework ?? "unknown"}

Code:
\`\`\`
${args.snippet}
\`\`\`

Return JSON with keys:
{
  "title": "<short title>",
  "rootCause": "<why this is exploitable>",
  "impact": "<business + technical impact>",
  "exploit": "<plausible attacker payload or scenario>",
  "remediationStrategy": "<framework-aware mitigation>",
  "cwe": "<CWE-ID if applicable>"
}`;
}

export function generateFixPrompt(args: {
  filePath: string;
  language?: string;
  fullFile: string;
  finding: { title: string; description: string; line?: number; snippet?: string; category: string };
  iteration: number;
  prevAttemptIssue?: string;
}) {
  return `You are the Fix Synthesizer agent. Produce a minimally-invasive patch.

Target file: ${args.filePath} (${args.language ?? "unknown"})
Vulnerability category: ${args.finding.category}
Finding: ${args.finding.title}
Description: ${args.finding.description}
${args.finding.line ? `Approx line: ${args.finding.line}` : ""}
${args.prevAttemptIssue ? `Previous attempt was rejected: ${args.prevAttemptIssue}` : ""}
Iteration: ${args.iteration}

ENTIRE current file:
\`\`\`
${args.fullFile}
\`\`\`

IMPORTANT: Respond with a single valid JSON object — NO markdown fences, NO extra text before or after the JSON.
All string values must be properly escaped (use \\n for newlines, \\\\ for backslashes, \\" for quotes inside strings).
Do NOT return the entire file — only the small block you are changing.

{
  "rationale": "<1-3 sentences explaining why this patch fixes the issue safely>",
  "before": "<the EXACT original lines you are replacing, copied verbatim from the file, including leading whitespace. Must appear EXACTLY ONCE in the file. Keep this short — only the lines that change.>",
  "after": "<the replacement lines that should take the place of 'before', preserving the same indentation style>",
  "notes": "<optional follow-up considerations or test recommendations>"
}

Rules:
- "before" MUST be an exact, byte-for-byte substring of the current file (including indentation and newlines). The server will use it to locate the patch site via simple string replacement, so it must match exactly and must be unique.
- Keep "before" / "after" small — ideally 1-15 lines. Just enough context to be unique.
- "after" MUST be different from "before" — produce a real code change that mitigates the vulnerability. Never return the same string for both.
- If the finding looks like a false positive, still produce a small defensive improvement (e.g. an input-validation guard, a clarifying comment about the threat model, or a stricter type) — never a no-op.
- "after" must preserve the file's existing indentation style (tabs vs spaces) and surrounding syntax.
- Do not introduce new dependencies unless strictly necessary.
- Do not change behavior unrelated to the vulnerability.
- Never wrap your response in markdown code fences.
- All four keys (rationale, before, after, notes) are required; "notes" may be an empty string but rationale/before/after must be non-empty.`;
}

export function reportSummaryPrompt(args: {
  projectName: string;
  totals: Record<string, number>;
  topFindings: { title: string; severity: string; filePath: string; category: string }[];
  fixes: number;
}) {
  return `Compose an executive security report for project "${args.projectName}".

Totals: ${JSON.stringify(args.totals)}
Top findings: ${JSON.stringify(args.topFindings)}
Auto-fixes applied: ${args.fixes}

Return JSON:
{
  "title": "<concise report title>",
  "summary": "<2-3 paragraph executive summary, technical but accessible>",
  "markdown": "<full multi-section markdown report with headings: Overview, Methodology, Key Findings, Fixes Applied, Residual Risk, Recommendations>"
}`;
}

export function cartographerPrompt(args: { tree: string; languages: { lang: string; files: number }[] }) {
  return `You are Code Cartographer. Given the project's file tree and language mix, produce a brief architectural snapshot.

Languages: ${JSON.stringify(args.languages)}
Tree (truncated):
${args.tree}

Return JSON:
{
  "stack": "<inferred stack like 'Next.js + Prisma + Postgres'>",
  "entrypoints": ["<paths>"],
  "criticalSurfaces": ["<paths likely to handle untrusted input>"],
  "suggestedAgents": ["<agent names to prioritize>"]
}`;
}
