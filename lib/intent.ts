import { prisma } from "./db";
import { chatCompletion, IntentProfileData } from "./deepseek";

const PROFILE_EXTRACTION_PROMPT = `You are an AI that analyzes a conversation and extracts a structured intent profile for the user.

Given the conversation history below, produce a JSON object with exactly this shape:
{
  "summary": "One or two sentence description of who this person is and what they want",
  "goals": ["goal1", "goal2"],
  "interests": ["interest1", "interest2"],
  "needs": ["need1", "need2"],
  "lookingFor": ["what they want to find or who they want to connect with"],
  "tags": ["keyword1", "keyword2", "keyword3"]
}

Rules:
- Be specific and concrete, not vague
- Each array should have 2-6 items max
- Tags should be single words or short 2-word phrases
- Only output valid JSON, nothing else`;

export async function extractAndSaveIntentProfile(
  userId: string,
  sessionId: string
): Promise<void> {
  // Fetch the conversation history
  const messages = await prisma.message.findMany({
    where: { sessionId },
    orderBy: { createdAt: "asc" },
  });

  // Need at least a few exchanges before profiling is meaningful
  const userMessages = messages.filter((m) => m.role === "user");
  if (userMessages.length < 2) return;

  // Build conversation text for the extraction prompt
  const conversationText = messages
    .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
    .join("\n");

  const raw = await chatCompletion(
    [
      { role: "system", content: PROFILE_EXTRACTION_PROMPT },
      {
        role: "user",
        content: `Here is the conversation:\n\n${conversationText}\n\nExtract the intent profile JSON:`,
      },
    ],
    { temperature: 0.2, maxTokens: 512 }
  );

  // Strip markdown code fences if the model wraps the JSON
  const jsonText = raw.replace(/```(?:json)?\n?/g, "").trim();
  const profile: IntentProfileData = JSON.parse(jsonText);

  const summaryText = profile.summary;
  const extractedTags = [...(profile.tags ?? []), ...(profile.interests ?? [])]
    .map((t) => t.toLowerCase().trim())
    .filter(Boolean)
    .join(", ");

  // Upsert so repeated calls just update the existing profile
  await prisma.intentProfile.upsert({
    where: { userId },
    create: {
      userId,
      sessionId,
      summaryText,
      profileJson: JSON.stringify(profile),
      extractedTags,
    },
    update: {
      sessionId,
      summaryText,
      profileJson: JSON.stringify(profile),
      extractedTags,
    },
  });
}
