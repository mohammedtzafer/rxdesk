import { NextResponse } from "next/server";
import { checkApiAuth } from "@/lib/auth-helpers";
import { getDrugByRxcui, getDrugInteractions } from "@/lib/rxnorm";
import { db } from "@/lib/db";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ rxcui: string }> }
) {
  const session = await checkApiAuth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { rxcui } = await params;

  // Check cache first — 30 day TTL
  const cached = await db.drugReference.findUnique({ where: { rxcui } });
  if (
    cached &&
    new Date().getTime() - cached.lastUpdated.getTime() < 30 * 24 * 60 * 60 * 1000
  ) {
    return NextResponse.json(cached);
  }

  try {
    const [drug, interactions] = await Promise.all([
      getDrugByRxcui(rxcui),
      getDrugInteractions(rxcui),
    ]);

    if (!drug) {
      return NextResponse.json({ error: "Drug not found" }, { status: 404 });
    }

    // Cache the result
    await db.drugReference.upsert({
      where: { rxcui },
      update: {
        name: drug.name,
        brandName: drug.brandName,
        genericName: drug.genericName,
        ndc: drug.ndc,
        dosageForm: drug.dosageForm,
        route: drug.route,
        strength: drug.strength,
        lastUpdated: new Date(),
        metadata: { interactions },
      },
      create: {
        rxcui,
        name: drug.name,
        brandName: drug.brandName,
        genericName: drug.genericName,
        ndc: drug.ndc,
        dosageForm: drug.dosageForm,
        route: drug.route,
        strength: drug.strength,
        metadata: { interactions },
      },
    });

    return NextResponse.json({ ...drug, interactions });
  } catch (error) {
    console.error("GET /api/drugs/[rxcui] error:", error);
    return NextResponse.json({ error: "Failed to fetch drug details" }, { status: 502 });
  }
}
