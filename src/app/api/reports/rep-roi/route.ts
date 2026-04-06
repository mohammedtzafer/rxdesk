import { NextResponse } from "next/server";
import { checkApiAuth, checkApiModuleAccess } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { parseDateRange, roundTo, toCsv, csvResponse } from "@/lib/report-utils";

export async function GET(req: Request) {
  const session = await checkApiAuth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { allowed } = await checkApiModuleAccess(session.user.id, "REPORTS", "VIEW");
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { startDate, endDate, locationId } = parseDateRange(req);
  const url = new URL(req.url);
  const fmt = url.searchParams.get("format");
  const orgId = session.user.organizationId!;

  const visits = await db.drugRepVisit.findMany({
    where: {
      organizationId: orgId,
      visitDate: { gte: startDate, lte: endDate },
      ...(locationId ? { locationId } : {}),
    },
    select: {
      id: true,
      visitDate: true,
      drugRepId: true,
      drugRep: { select: { firstName: true, lastName: true, company: true } },
      providers: {
        select: { provider: { select: { id: true, firstName: true, lastName: true, npi: true } } },
      },
    },
    orderBy: { visitDate: "asc" },
  });

  const rows = [];
  for (const visit of visits) {
    const postVisitEnd = new Date(visit.visitDate);
    postVisitEnd.setDate(postVisitEnd.getDate() + 30);

    const providerIds = visit.providers.map((vp) => vp.provider.id);
    if (providerIds.length === 0) continue;

    const postVisitRx = await db.prescriptionRecord.count({
      where: {
        organizationId: orgId,
        providerId: { in: providerIds },
        fillDate: { gt: visit.visitDate, lte: postVisitEnd },
        isGeneric: false,
        status: "B",
      },
    });

    rows.push({
      visitDate: visit.visitDate.toISOString().split("T")[0],
      repName: `${visit.drugRep.firstName} ${visit.drugRep.lastName}`,
      company: visit.drugRep.company,
      providers: visit.providers.map((vp) => `${vp.provider.firstName} ${vp.provider.lastName}`).join("; "),
      providerCount: providerIds.length,
      brandScripts30d: postVisitRx,
    });
  }

  const totalVisits = rows.length;
  const totalBrandScripts = rows.reduce((sum, r) => sum + r.brandScripts30d, 0);
  const avgScriptsPerVisit = totalVisits > 0 ? roundTo(totalBrandScripts / totalVisits) : 0;

  if (fmt === "csv") {
    return csvResponse(
      toCsv(["visitDate", "repName", "company", "providers", "providerCount", "brandScripts30d"], rows as unknown as Record<string, unknown>[]),
      "rep-roi.csv"
    );
  }

  return NextResponse.json({ rows, totals: { totalVisits, totalBrandScripts, avgScriptsPerVisit } });
}
