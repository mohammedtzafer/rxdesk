import { NextResponse } from "next/server";
import { checkApiAuth, checkApiModuleAccess } from "@/lib/auth-helpers";
import { searchNppes } from "@/lib/nppes";

export async function GET(req: Request) {
  const session = await checkApiAuth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { allowed } = await checkApiModuleAccess(session.user.id, "PROVIDERS", "EDIT");
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(req.url);
  const npi = url.searchParams.get("npi") || undefined;
  const firstName = url.searchParams.get("firstName") || undefined;
  const lastName = url.searchParams.get("lastName") || undefined;
  const state = url.searchParams.get("state") || undefined;
  const city = url.searchParams.get("city") || undefined;
  const specialty = url.searchParams.get("specialty") || undefined;

  if (!npi && !lastName && !firstName) {
    return NextResponse.json(
      { error: "Please provide at least an NPI number, first name, or last name" },
      { status: 400 }
    );
  }

  try {
    const results = await searchNppes({
      npi,
      firstName,
      lastName,
      state,
      city,
      specialty,
      limit: 20,
    });

    return NextResponse.json({ results });
  } catch (error) {
    console.error("GET /api/providers/search-nppes error:", error);
    return NextResponse.json(
      { error: "Failed to search NPPES registry" },
      { status: 502 }
    );
  }
}
