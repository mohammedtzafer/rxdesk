import { NextResponse } from "next/server";
import { checkApiAuth, checkApiModuleAccess } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { calculateCorrelations } from "@/lib/correlations";

export async function GET(req: Request) {
  const session = await checkApiAuth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { allowed } = await checkApiModuleAccess(session.user.id, "DRUG_REPS", "VIEW");
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const url = new URL(req.url);
  const providerId = url.searchParams.get("providerId") || undefined;
  const days = parseInt(url.searchParams.get("days") || "180");

  const now = new Date();
  const windowStart = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

  const visitWhere: Record<string, unknown> = {
    organizationId: session.user.organizationId,
    visitDate: { gte: windowStart },
  };

  const visits = await db.drugRepVisit.findMany({
    where: visitWhere,
    orderBy: { visitDate: "asc" },
    select: {
      id: true,
      visitDate: true,
      drugsPromoted: true,
      drugRep: { select: { firstName: true, lastName: true, company: true } },
      providers: {
        select: { providerId: true },
        ...(providerId ? { where: { providerId } } : {}),
      },
    },
  });

  // Filter to visits that have at least one linked provider
  const relevantVisits = providerId
    ? visits.filter((v) => v.providers.length > 0)
    : visits;

  // Collect all provider IDs from the relevant visits
  const allProviderIds = new Set<string>();
  for (const v of relevantVisits) {
    for (const p of v.providers) {
      allProviderIds.add(p.providerId);
    }
  }

  if (allProviderIds.size === 0) {
    return NextResponse.json({ correlations: [], visits: relevantVisits });
  }

  const rxRecords = await db.prescriptionRecord.findMany({
    where: {
      organizationId: session.user.organizationId,
      providerId: { in: Array.from(allProviderIds) },
      fillDate: { gte: windowStart },
    },
    select: {
      providerId: true,
      fillDate: true,
      drugName: true,
      isGeneric: true,
    },
    orderBy: { fillDate: "asc" },
  });

  const correlations = calculateCorrelations(
    relevantVisits.map((v) => ({
      id: v.id,
      visitDate: v.visitDate,
      drugsPromoted: v.drugsPromoted as Array<{ name: string }>,
      repName: `${v.drugRep.firstName} ${v.drugRep.lastName}`,
      company: v.drugRep.company,
      providerIds: v.providers.map((p) => p.providerId),
    })),
    rxRecords.map((r) => ({
      providerId: r.providerId!,
      fillDate: r.fillDate,
      drugName: r.drugName,
      isGeneric: r.isGeneric,
    }))
  );

  return NextResponse.json({ correlations, visits: relevantVisits });
}
