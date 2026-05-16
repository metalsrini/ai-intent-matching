import { prisma } from "./db";
import { chatCompletion, IntentProfileData } from "./deepseek";

const THRESHOLD = parseFloat(process.env.MATCH_THRESHOLD ?? "0.35");

const SCORING_PROMPT = `You are a compatibility scoring engine. Given two user intent profiles, evaluate how well they could connect or collaborate.

Return a JSON object with exactly this shape:
{
  "score": 0.72,
  "rationale": "One or two sentences explaining the key reasons they are a good match.",
  "sharedThemes": ["theme1", "theme2", "theme3"]
}

Rules:
- score is a float between 0.0 (no match) and 1.0 (perfect match)
- Consider overlap in goals, interests, needs, and what each person is looking for
- sharedThemes should list 2–5 concrete topics or themes they share
- Only output valid JSON, nothing else`;

// Quick keyword-overlap pre-filter using Jaccard similarity.
// If this is already very low we can skip the expensive LLM call.
function jaccardSimilarity(a: string[], b: string[]): number {
  if (a.length === 0 && b.length === 0) return 0;
  const setA = new Set(a.map((s) => s.toLowerCase().trim()));
  const setB = new Set(b.map((s) => s.toLowerCase().trim()));
  const intersection = new Set([...setA].filter((x) => setB.has(x)));
  const union = new Set([...setA, ...setB]);
  return intersection.size / union.size;
}

function allKeywords(profile: IntentProfileData): string[] {
  return [
    ...(profile.goals ?? []),
    ...(profile.interests ?? []),
    ...(profile.needs ?? []),
    ...(profile.lookingFor ?? []),
    ...(profile.tags ?? []),
  ];
}

async function scorePair(
  profileA: IntentProfileData,
  profileB: IntentProfileData
): Promise<{ score: number; rationale: string; sharedThemes: string[] }> {
  // Pre-filter: if keyword overlap is essentially zero, skip LLM
  const quickScore = jaccardSimilarity(
    allKeywords(profileA),
    allKeywords(profileB)
  );
  if (quickScore < 0.02) {
    return {
      score: quickScore,
      rationale: "Profiles share no common themes.",
      sharedThemes: [],
    };
  }

  const raw = await chatCompletion(
    [
      { role: "system", content: SCORING_PROMPT },
      {
        role: "user",
        content: `Profile A:\n${JSON.stringify(profileA, null, 2)}\n\nProfile B:\n${JSON.stringify(profileB, null, 2)}\n\nScore their compatibility:`,
      },
    ],
    { temperature: 0.1, maxTokens: 256 }
  );

  const jsonText = raw.replace(/```(?:json)?\n?/g, "").trim();
  return JSON.parse(jsonText);
}

// Run matching for a given user against all other users with profiles.
// Upserts Match records; returns matches above the threshold.
export async function runMatchingForUser(userId: string) {
  const myProfile = await prisma.intentProfile.findUnique({
    where: { userId },
  });
  if (!myProfile) return [];

  const otherProfiles = await prisma.intentProfile.findMany({
    where: { userId: { not: userId } },
    include: { user: { select: { id: true, displayName: true } } },
  });

  if (otherProfiles.length === 0) return [];

  const myData: IntentProfileData = JSON.parse(myProfile.profileJson);
  const results = [];

  for (const other of otherProfiles) {
    const otherData: IntentProfileData = JSON.parse(other.profileJson);

    const { score, rationale, sharedThemes } = await scorePair(
      myData,
      otherData
    );

    // Canonical ordering so we don't duplicate (A,B) and (B,A)
    const [userAId, userBId] =
      userId < other.userId
        ? [userId, other.userId]
        : [other.userId, userId];

    await prisma.match.upsert({
      where: { userAId_userBId: { userAId, userBId } },
      create: {
        userAId,
        userBId,
        similarityScore: score,
        rationale,
        sharedThemes: sharedThemes.join(", "),
      },
      update: {
        similarityScore: score,
        rationale,
        sharedThemes: sharedThemes.join(", "),
      },
    });

    if (score >= THRESHOLD) {
      results.push({
        matchedUserId: other.userId,
        matchedUserName: other.user.displayName,
        score,
        rationale,
        sharedThemes,
      });
    }
  }

  return results;
}

// Fetch existing matches for a user (above threshold) for display
export async function getMatchesForUser(userId: string) {
  const threshold = THRESHOLD;

  const matches = await prisma.match.findMany({
    where: {
      OR: [{ userAId: userId }, { userBId: userId }],
      similarityScore: { gte: threshold },
    },
    include: {
      userA: { select: { id: true, displayName: true } },
      userB: { select: { id: true, displayName: true } },
    },
    orderBy: { similarityScore: "desc" },
  });

  return matches.map((m) => {
    const matchedUser = m.userAId === userId ? m.userB : m.userA;
    return {
      matchedUserId: matchedUser.id,
      matchedUserName: matchedUser.displayName,
      score: m.similarityScore,
      rationale: m.rationale,
      sharedThemes: m.sharedThemes.split(", ").filter(Boolean),
    };
  });
}
