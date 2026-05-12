import type { Category, Severity } from "@/types/zg";

export type RawFinding = {
  agent: string;
  category: Category;
  severity: Severity;
  cwe?: string;
  title: string;
  description: string;
  filePath: string;
  line?: number;
  endLine?: number;
  snippet?: string;
  confidence?: number;
};

export type ScannerInput = {
  path: string;
  content: string;
  language?: string | null;
};

export type Scanner = (file: ScannerInput) => RawFinding[];

export function takeSnippet(content: string, line: number, ctx = 2): string {
  const lines = content.split(/\r?\n/);
  const start = Math.max(0, line - 1 - ctx);
  const end = Math.min(lines.length, line + ctx);
  return lines.slice(start, end).join("\n");
}

export function lineOf(content: string, index: number): number {
  let line = 1;
  for (let i = 0; i < index && i < content.length; i++) {
    if (content[i] === "\n") line++;
  }
  return line;
}
