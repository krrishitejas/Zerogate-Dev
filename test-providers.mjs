// Quick test: verify each provider works via the multi-provider AI client
// Run: node --experimental-modules test-providers.mjs

const providers = [
  {
    name: "OpenRouter (GPT-OSS-120B)",
    baseUrl: process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1",
    apiKey: process.env.OPENROUTER_API_KEY,
    model: "openai/gpt-oss-120b:free",
    headers: (key) => ({
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
      "HTTP-Referer": "http://localhost:3000",
      "X-Title": "ZEROGATE"
    })
  },
  {
    name: "NVIDIA NIM (Llama 3.3 70B)",
    baseUrl: process.env.NVIDIA_BASE_URL || "https://integrate.api.nvidia.com/v1",
    apiKey: process.env.NVIDIA_API_KEY,
    model: "meta/llama-3.3-70b-instruct",
    headers: (key) => ({
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`
    })
  },
  {
    name: "NVIDIA NIM (Nemotron Super 49B)",
    baseUrl: process.env.NVIDIA_BASE_URL || "https://integrate.api.nvidia.com/v1",
    apiKey: process.env.NVIDIA_API_KEY,
    model: "nvidia/llama-3.3-nemotron-super-49b-v1",
    headers: (key) => ({
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`
    })
  },
  {
    name: "NVIDIA NIM (Qwen3-Coder 480B)",
    baseUrl: process.env.NVIDIA_BASE_URL || "https://integrate.api.nvidia.com/v1",
    apiKey: process.env.NVIDIA_API_KEY,
    model: "qwen/qwen3-coder-480b-a35b-instruct",
    headers: (key) => ({
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`
    })
  },
  {
    name: "OpenRouter (Nemotron 3 Super 120B:free)",
    baseUrl: process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1",
    apiKey: process.env.OPENROUTER_API_KEY,
    model: "nvidia/nemotron-3-super-120b-a12b:free",
    headers: (key) => ({
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
      "HTTP-Referer": "http://localhost:3000",
      "X-Title": "ZEROGATE"
    })
  },
  {
    name: "OpenRouter (MiniMax M2.5:free)",
    baseUrl: process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1",
    apiKey: process.env.OPENROUTER_API_KEY,
    model: "minimax/minimax-m2.5:free",
    headers: (key) => ({
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
      "HTTP-Referer": "http://localhost:3000",
      "X-Title": "ZEROGATE"
    })
  },
  {
    name: "HuggingFace (Qwen3-235B)",
    baseUrl: process.env.HF_BASE_URL || "https://router.huggingface.co/v1",
    apiKey: process.env.HF_TOKEN,
    model: "Qwen/Qwen3-235B-A22B",
    headers: (key) => ({
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`
    })
  }
];

async function testProvider(p) {
  if (!p.apiKey) {
    return { name: p.name, status: "SKIP", msg: "No API key" };
  }
  try {
    const res = await fetch(`${p.baseUrl}/chat/completions`, {
      method: "POST",
      headers: p.headers(p.apiKey),
      body: JSON.stringify({
        model: p.model,
        messages: [{ role: "user", content: "Reply with exactly: ZEROGATE_OK" }],
        max_tokens: 20,
        temperature: 0
      }),
      signal: AbortSignal.timeout(30000)
    });
    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content || "";
    const error = data?.error?.message || data?.error || data?.detail || "";
    if (content) {
      return { name: p.name, status: "✅ OK", msg: content.trim().slice(0, 40) };
    } else {
      return { name: p.name, status: "❌ FAIL", msg: typeof error === 'string' ? error.slice(0, 60) : JSON.stringify(error).slice(0, 60) };
    }
  } catch (err) {
    return { name: p.name, status: "❌ ERROR", msg: err.message?.slice(0, 60) };
  }
}

// Load env manually
const fs = await import("fs");
const envContent = fs.readFileSync(".env", "utf-8");
for (const line of envContent.split("\n")) {
  const m = line.match(/^([A-Z_]+)="(.*)"/);
  if (m) process.env[m[1]] = m[2];
}

// Update apiKeys after loading env
for (const p of providers) {
  if (p.name.includes("OpenRouter")) p.apiKey = process.env.OPENROUTER_API_KEY;
  else if (p.name.includes("NVIDIA")) p.apiKey = process.env.NVIDIA_API_KEY;
  else if (p.name.includes("HuggingFace")) p.apiKey = process.env.HF_TOKEN;
}

console.log("\n🔍 ZEROGATE Multi-Provider Test\n" + "=".repeat(60));

const results = await Promise.all(providers.map(testProvider));
for (const r of results) {
  const pad = r.name.padEnd(42);
  console.log(`  ${r.status}  ${pad} ${r.msg}`);
}

const ok = results.filter(r => r.status === "✅ OK").length;
const total = results.length;
console.log(`\n  ${ok}/${total} providers working\n`);
