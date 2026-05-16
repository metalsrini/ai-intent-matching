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
export const INTENT_DISCOVERY_SYSTEM_PROMPT = `You are an intent discovery assistant. Your job is to help users articulate their goals, interests, needs, and what kind of people or opportunities they are looking for.

Be conversational, warm, and concise. Never sound like a form or a survey.
Ask one thoughtful follow-up question at a time that naturally draws out:
- What they are trying to build, achieve, or explore
- Their professional or personal goals
- Their interests and domain context
- What kind of collaborators, tools, resources, or opportunities they seek
- What makes an ideal connection for them

Keep each response short (2–4 sentences max). Be genuinely curious. When the user shares something interesting, acknowledge it before asking the next question.`;

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
