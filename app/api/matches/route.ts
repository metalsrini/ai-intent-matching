import { NextRequest, NextResponse } from "next/server";
import { getMatchesForUser, runMatchingForUser } from "@/lib/matching";

// GET /api/matches?userId=xxx — return current matches for a user
export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId");
  if (!userId) {
    return NextResponse.json({ error: "userId required" }, { status: 400 });
  }

  try {
    const matches = await getMatchesForUser(userId);
    return NextResponse.json({ matches });
  } catch (err) {
    console.error("[GET /api/matches]", err);
    return NextResponse.json(
      { error: "Failed to fetch matches" },
      { status: 500 }
    );
  }
}

// POST /api/matches — trigger matching on demand
// Body: { userId }
export async function POST(req: NextRequest) {
  try {
    const { userId } = await req.json();
    if (!userId) {
      return NextResponse.json({ error: "userId required" }, { status: 400 });
    }

    const matches = await runMatchingForUser(userId);
    return NextResponse.json({ matches });
  } catch (err) {
    console.error("[POST /api/matches]", err);
    return NextResponse.json(
      { error: "Failed to run matching" },
      { status: 500 }
    );
  }
}
