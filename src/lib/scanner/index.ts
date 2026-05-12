import { sqliScanner } from "./sqli";
import { xssScanner } from "./xss";
import { secretsScanner } from "./secrets";
import { authCryptoScanner, dependencyScanner, ssrfPathScanner } from "./misc";
import type { RawFinding, ScannerInput } from "./types";

export type RegisteredScanner = {
  id: string;
  agent: string;
  scan: (input: ScannerInput) => RawFinding[];
};

export const SCANNERS: RegisteredScanner[] = [
  { id: "sqli",         agent: "sqli-hunter",        scan: sqliScanner },
  { id: "xss",          agent: "xss-defender",       scan: xssScanner },
  { id: "secrets",      agent: "secret-sentinel",    scan: secretsScanner },
  { id: "auth-crypto",  agent: "auth-crypto",        scan: authCryptoScanner },
  { id: "ssrf-path",    agent: "ssrf-path",          scan: ssrfPathScanner },
  { id: "dependency",   agent: "dependency-auditor", scan: dependencyScanner }
];

const SCAN_EXT_BLACKLIST = new Set([
  "png","jpg","jpeg","gif","webp","ico","svg","pdf","zip","tar","gz","bz2","7z",
  "mp3","mp4","mov","avi","wmv","wav","ogg",
  "ttf","otf","woff","woff2","eot",
  "lock","pyc","class","jar","exe","dll","so","dylib","bin"
]);

export function shouldScanFile(path: string): boolean {
  const ext = path.split(".").pop()?.toLowerCase();
  if (!ext) return true;
  if (SCAN_EXT_BLACKLIST.has(ext)) return false;
  if (/(^|\/)node_modules\//.test(path)) return false;
  if (/(^|\/)\.next\//.test(path)) return false;
  if (/(^|\/)dist\//.test(path)) return false;
  if (/(^|\/)build\//.test(path)) return false;
  return true;
}

export function runAllScanners(file: ScannerInput): RawFinding[] {
  const out: RawFinding[] = [];
  for (const s of SCANNERS) {
    try {
      out.push(...s.scan(file));
    } catch (err) {
      console.error(`scanner ${s.id} failed on ${file.path}`, err);
    }
  }
  return out;
}
