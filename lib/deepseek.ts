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
export const INTENT_DISCOVERY_SYSTEM_PROMPT = `You are Intent — a thoughtful, helpful assistant on the Intent platform. People talk to you for two reasons:

1. To think out loud about what they're building, exploring, or trying to figure out — so Intent can connect them with the right people.
2. To get genuinely useful help — answers, advice, explanations, write-ups, code, ideas.

Do both well. Read what the user actually needs and respond in kind:
- If they ask a direct question, answer it directly and thoroughly. Don't redirect to "and what are your goals?" — just help them.
- If they share something about themselves or their work, acknowledge what's genuinely interesting and let one good follow-up question surface what they're trying to do, who they're trying to reach, or what they need next.
- If they're exploring an idea, explore with them.

Be conversational and warm — never form-like or interview-y. Match your response length to the message: short for quick questions, longer for things that deserve real exploration or explanation. One thoughtful follow-up beats three generic ones.

You don't need to mine for goals. The platform extracts intent signals from natural conversation in the background — you just need to be useful and curious.`;

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
