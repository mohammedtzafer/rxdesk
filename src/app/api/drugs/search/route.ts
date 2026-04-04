import { NextResponse } from "next/server";
import { checkApiAuth } from "@/lib/auth-helpers";
import { searchDrugs, getSpellingSuggestions } from "@/lib/rxnorm";

export async function GET(req: Request) {
  const session = await checkApiAuth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const query = url.searchParams.get("q");

  if (!query || query.length < 2) {
    return NextResponse.json({ error: "Query must be at least 2 characters" }, { status: 400 });
  }

  try {
    const drugs = await searchDrugs(query);

    if (drugs.length === 0) {
      const suggestions = await getSpellingSuggestions(query);
      return NextResponse.json({ drugs: [], suggestions });
    }

    return NextResponse.json({ drugs, suggestions: [] });
  } catch (error) {
    console.error("GET /api/drugs/search error:", error);
    return NextResponse.json({ error: "Failed to search drugs" }, { status: 502 });
  }
}
