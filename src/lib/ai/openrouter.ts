// Multi-provider AI client for ZEROGATE agents.
// Supports: OpenRouter, NVIDIA NIM, HuggingFace Inference API
// All three expose OpenAI-compatible /v1/chat/completions endpoints.

export type AIMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type AICallOptions = {
  model?: string;
  messages: AIMessage[];
  temperature?: number;
  maxTokens?: number;
  json?: boolean;
  stream?: boolean;
  signal?: AbortSignal;
  metadata?: Record<string, string | number | boolean>;
};

export type AIResponse = {
  content: string;
  model: string;
  provider: string;
  usage?: { promptTokens?: number; completionTokens?: number; totalTokens?: number };
  raw?: unknown;
};

/* ════════════════════════════════════════════════════════════════════════
   Provider configuration
   ════════════════════════════════════════════════════════════════════════ */

type ProviderConfig = {
  name: string;
  baseUrl: string;
  apiKey: string | undefined;
  headers: (apiKey: string) => Record<string, string>;
  /** Whether the provider supports response_format: json_object */
  supportsJsonMode: boolean;
};

const PROVIDERS: Record<string, ProviderConfig> = {
  openrouter: {
    name: "OpenRouter",
    baseUrl: process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1",
    apiKey: process.env.OPENROUTER_API_KEY,
    headers: (key) => ({
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
      "HTTP-Referer": process.env.APP_URL || "http://localhost:3000",
      "X-Title": "ZEROGATE"
    }),
    supportsJsonMode: true
  },
  nvidia: {
    name: "NVIDIA NIM",
    baseUrl: process.env.NVIDIA_BASE_URL || "https://integrate.api.nvidia.com/v1",
    apiKey: process.env.NVIDIA_API_KEY,
    headers: (key) => ({
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`
    }),
    supportsJsonMode: false
  },
  huggingface: {
    name: "HuggingFace",
    baseUrl: process.env.HF_BASE_URL || "https://router.huggingface.co/v1",
    apiKey: process.env.HF_TOKEN,
    headers: (key) => ({
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`
    }),
    supportsJsonMode: false
  }
};

/* ════════════════════════════════════════════════════════════════════════
   Per-agent model selection — diversified across 3 providers
   Format: "provider:model-id" — the provider prefix routes the request
   ════════════════════════════════════════════════════════════════════════ */

// Fix Synthesizer — DeepSeek V3 on OpenRouter (best code gen, 128k context)
export const MODEL_FIX_SYNTHESIZER =
  process.env.MODEL_FIX_SYNTHESIZER || "openrouter:deepseek/deepseek-chat";

// SQLi Hunter — DeepSeek V3 on OpenRouter (top-tier reasoning)
export const MODEL_SQLI_HUNTER =
  process.env.MODEL_SQLI_HUNTER || "openrouter:deepseek/deepseek-chat";

// XSS Defender — Qwen3-Coder on OpenRouter (strong code analysis)
export const MODEL_XSS_DEFENDER =
  process.env.MODEL_XSS_DEFENDER || "openrouter:qwen/qwen3-coder";

// Secret Sentinel — DeepSeek V3 on OpenRouter (pattern matching, structured analysis)
export const MODEL_SECRET_SENTINEL =
  process.env.MODEL_SECRET_SENTINEL || "openrouter:deepseek/deepseek-chat";

// Auth & Crypto Inspector — Qwen3-Coder on OpenRouter (security reasoning)
export const MODEL_AUTH_CRYPTO =
  process.env.MODEL_AUTH_CRYPTO || "openrouter:qwen/qwen3-coder";

// SSRF / Path Traversal — DeepSeek V3 on OpenRouter (URL/path analysis)
export const MODEL_SSRF_PATH =
  process.env.MODEL_SSRF_PATH || "openrouter:deepseek/deepseek-chat";

// Dependency Auditor — DeepSeek V3 on OpenRouter (broad CVE knowledge)
export const MODEL_DEPENDENCY_AUDITOR =
  process.env.MODEL_DEPENDENCY_AUDITOR || "openrouter:deepseek/deepseek-chat";

// ── Utility models (Cartographer, Explainer, Report Composer) ──
export const MODEL_REASONING =
  process.env.MODEL_REASONING || "openrouter:deepseek/deepseek-chat";
export const MODEL_CODE =
  process.env.MODEL_CODE || "openrouter:qwen/qwen3-coder";
export const MODEL_FAST =
  process.env.MODEL_FAST || "openrouter:deepseek/deepseek-chat";

/* ════════════════════════════════════════════════════════════════════════
   Core functions
   ════════════════════════════════════════════════════════════════════════ */

export class AIProviderError extends Error {
  constructor(public provider: string, public status: number, message: string, public data?: unknown) {
    super(message);
    this.name = "AIProviderError";
  }
}

// Keep backward compat
export { AIProviderError as OpenRouterError };

export function isAIConfigured(): boolean {
  return !!(
    process.env.OPENROUTER_API_KEY ||
    process.env.NVIDIA_API_KEY ||
    process.env.HF_TOKEN
  );
}

/**
 * Parse a model string like "nvidia:meta/llama-3.3-70b-instruct" into
 * { provider, modelId }. Falls back to "openrouter" if no prefix.
 */
function parseModelSpec(model: string): { provider: string; modelId: string } {
  const colonIdx = model.indexOf(":");
  if (colonIdx === -1) {
    // No provider prefix — treat entire string as OpenRouter model
    return { provider: "openrouter", modelId: model };
  }

  const maybeProv = model.slice(0, colonIdx).toLowerCase();
  if (maybeProv in PROVIDERS) {
    return { provider: maybeProv, modelId: model.slice(colonIdx + 1) };
  }

  // The colon may be part of the model name (e.g. "deepseek/deepseek-r1:free")
  // Check if it looks like a known provider
  return { provider: "openrouter", modelId: model };
}

/**
 * Multi-provider completion via OpenAI-compatible endpoints.
 * The model string determines which provider to use (e.g. "nvidia:model-id").
 * Falls back to a mock response when no API key is configured.
 */
export async function aiComplete(opts: AICallOptions): Promise<AIResponse> {
  const rawModel = opts.model || MODEL_REASONING;
  const { provider: providerKey, modelId } = parseModelSpec(rawModel);
  const provider = PROVIDERS[providerKey];

  if (!provider) {
    throw new AIProviderError(providerKey, 0, `Unknown AI provider: ${providerKey}`);
  }

  const apiKey = provider.apiKey;
  if (!apiKey) {
    // Try falling back to OpenRouter if the preferred provider has no key
    const fallbackKey = process.env.OPENROUTER_API_KEY;
    if (fallbackKey && providerKey !== "openrouter") {
      console.warn(
        `[ZEROGATE AI] ${provider.name} API key not set, falling back to OpenRouter for model ${modelId}`
      );
      return aiComplete({
        ...opts,
        model: `openrouter:${modelId}`
      });
    }
    return mockComplete(opts, modelId, providerKey);
  }

  const body: Record<string, unknown> = {
    model: modelId,
    messages: opts.messages,
    temperature: opts.temperature ?? 0.2,
    max_tokens: opts.maxTokens ?? 8192
  };

  // Only add json_object mode if the provider supports it
  if (opts.json && provider.supportsJsonMode) {
    body.response_format = { type: "json_object" };
  }

  const res = await fetch(`${provider.baseUrl}/chat/completions`, {
    method: "POST",
    signal: opts.signal,
    headers: provider.headers(apiKey),
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const text = await res.text();
    throw new AIProviderError(
      providerKey,
      res.status,
      `${provider.name} ${res.status}: ${text.slice(0, 300)}`
    );
  }

  const data = (await res.json()) as any;
  const content: string =
    data?.choices?.[0]?.message?.content ??
    data?.choices?.[0]?.text ??
    "";

  return {
    content,
    model: data?.model ?? modelId,
    provider: provider.name,
    usage: {
      promptTokens: data?.usage?.prompt_tokens,
      completionTokens: data?.usage?.completion_tokens,
      totalTokens: data?.usage?.total_tokens
    },
    raw: data
  };
}

/* ════════════════════════════════════════════════════════════════════════
   JSON extraction (robust, handles LLM output quirks)
   ════════════════════════════════════════════════════════════════════════ */

/**
 * Helper: extract a JSON object from a model response, tolerating markdown fences,
 * nested braces inside string values, and other LLM output quirks.
 */
export function extractJSON<T = unknown>(text: string): T | null {
  if (!text) return null;

  // Strategy 1: strip markdown fences and try direct parse
  const stripped = text.replace(/```(?:json)?\s*/gi, "").replace(/```/g, "").trim();
  try {
    return JSON.parse(stripped) as T;
  } catch { /* continue */ }

  // Strategy 2: find the outermost balanced { ... } using a brace-depth counter
  //   that respects JSON string literals (handles nested braces in code strings)
  const result = extractBalancedJSON(stripped);
  if (result) {
    try {
      return JSON.parse(result) as T;
    } catch { /* continue */ }
  }

  // Strategy 3: try on the original text (without fence stripping)
  const resultOrig = extractBalancedJSON(text);
  if (resultOrig) {
    try {
      return JSON.parse(resultOrig) as T;
    } catch { /* continue */ }
  }

  // Strategy 4: greedy first-{ to last-} fallback
  const first = text.indexOf("{");
  const last = text.lastIndexOf("}");
  if (first !== -1 && last > first) {
    try {
      return JSON.parse(text.slice(first, last + 1)) as T;
    } catch { /* give up */ }
  }

  return null;
}

/** Walk through text character-by-character to find the first balanced top-level JSON object. */
function extractBalancedJSON(text: string): string | null {
  let start = -1;
  let depth = 0;
  let inString = false;
  let escape = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (escape) {
      escape = false;
      continue;
    }

    if (ch === "\\" && inString) {
      escape = true;
      continue;
    }

    if (ch === '"' && !escape) {
      inString = !inString;
      continue;
    }

    if (inString) continue;

    if (ch === "{") {
      if (depth === 0) start = i;
      depth++;
    } else if (ch === "}") {
      depth--;
      if (depth === 0 && start !== -1) {
        return text.slice(start, i + 1);
      }
    }
  }
  return null;
}

/* ════════════════════════════════════════════════════════════════════════
   Mock fallback (no API keys configured)
   ════════════════════════════════════════════════════════════════════════ */
function mockComplete(opts: AICallOptions, model: string, provider: string): AIResponse {
  const last = opts.messages[opts.messages.length - 1]?.content || "";

  // If callers ask for JSON, return safe empty JSON.
  if (opts.json) {
    return {
      content: JSON.stringify({
        ok: true,
        note: `No API key configured for ${provider} — returning empty AI result.`,
        findings: [],
        fix: null,
        summary: "AI offline. Static analysis findings remain authoritative.",
        items: []
      }),
      model: `${model} (offline)`,
      provider
    };
  }

  // Otherwise produce a neutral textual answer.
  return {
    content:
      `ZEROGATE AI is running in offline mode (${provider} key missing). ` +
      "Static analyzers still produced findings; configure the key for AI explanations and patches.\n\n" +
      `Echo: ${last.slice(0, 200)}`,
    model: `${model} (offline)`,
    provider
  };
}
