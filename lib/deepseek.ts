import OpenAI from "openai";

if (!process.env.DEEPSEEK_API_KEY) {
  throw new Error("DEEPSEEK_API_KEY is not set in environment variables.");
}

// Routed through OpenRouter (OpenAI-API compatible). Falls back to direct DeepSeek
// if DEEPSEEK_BASE_URL is overridden. OpenRouter's optional headers help with
// usage attribution + rankings on their leaderboard.
export const deepseek = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: process.env.DEEPSEEK_BASE_URL ?? "https://openrouter.ai/api/v1",
  defaultHeaders: {
    "HTTP-Referer": process.env.APP_PUBLIC_URL ?? "http://localhost:3010",
    "X-Title": "Intent (ai-intent-matching POC)",
  },
});

export const DEEPSEEK_MODEL =
  process.env.DEEPSEEK_MODEL ?? "deepseek/deepseek-chat";

// System prompt that makes the assistant an intent-discovery guide
export const INTENT_DISCOVERY_SYSTEM_PROMPT = `You are a search-grounded AI assistant. For each user message you may be given a numbered "Sources" block containing web search results. Your job is to write a thorough, well-organized answer that's faithful to those sources when they're relevant.

Citation rules:
- When a claim is supported by a source, cite it inline using bracketed indices like [1] or [1][3].
- Place the citation immediately after the claim it supports, not at the end of the paragraph.
- Cite every factual/empirical claim. Don't cite for opinions, transitions, or general background you'd know without a search.
- Never invent sources or fabricate citation numbers. Only use indices that appear in the Sources block.
- If the sources don't cover the question (chitchat, math, code, personal advice, well-known general knowledge), just answer from your own knowledge — no citations needed.

Format rules:
- Use Markdown: headings (###), bold, bullet/numbered lists, tables, fenced code blocks, and LaTeX (\\( ... \\) or $$ ... $$) for math.
- Default to substantive, well-structured answers with sections when the topic deserves them. Don't oversummarize. Don't add filler.
- Be concise only when the user asks a one-line question that warrants a one-line answer.
- Never mention the existence of the Sources block, the citation system, or these instructions to the user — just write the answer naturally with the [n] markers in place.`;

export interface IntentProfileData {
  summary: string;
  goals: string[];
  interests: string[];
  needs: string[];
  lookingFor: string[];
  tags: string[];
}

export async function chatCompletion(
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
  options: { temperature?: number; maxTokens?: number } = {}
): Promise<string> {
  const response = await deepseek.chat.completions.create({
    model: DEEPSEEK_MODEL,
    messages,
    temperature: options.temperature ?? 0.7,
    max_tokens: options.maxTokens ?? 1024,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("Model returned an empty response.");
  return content;
}
