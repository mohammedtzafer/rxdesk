import { NextResponse } from "next/server";
import { checkApiAuth, checkApiModuleAccess } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { parseDateRange, roundTo, toCsv, csvResponse } from "@/lib/report-utils";

export async function GET(req: Request) {
  const session = await checkApiAuth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { allowed } = await checkApiModuleAccess(session.user.id, "REPORTS", "VIEW");
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { startDate, endDate } = parseDateRange(req);
  const url = new URL(req.url);
  const fmt = url.searchParams.get("format");
  const orgId = session.user.organizationId!;

  const visits = await db.drugRepVisit.findMany({
    where: {
      organizationId: orgId,
      visitDate: { gte: startDate, lte: endDate },
    },
    select: {
      id: true,
      visitDate: true,
      drugRep: { select: { firstName: true, lastName: true, company: true } },
      providers: { select: { provider: { select: { id: true, firstName: true, lastName: true } } } },
    },
    orderBy: { visitDate: "asc" },
  });

  const rows = [];
  for (const visit of visits) {
    const providerIds = visit.providers.map((vp) => vp.provider.id);
    if (providerIds.length === 0) continue;

    const counts: Record<string, number> = {};
    for (const window of [7, 14, 30] as const) {
      const windowEnd = new Date(visit.visitDate);
      windowEnd.setDate(windowEnd.getDate() + window);

      counts[`scripts${window}d`] = await db.prescriptionRecord.count({
        where: {
          organizationId: orgId,
          providerId: { in: providerIds },
          fillDate: { gt: visit.visitDate, lte: windowEnd },
          status: "B",
        },
      });
    }

    rows.push({
      visitDate: visit.visitDate.toISOString().split("T")[0],
      repName: `${visit.drugRep.firstName} ${visit.drugRep.lastName}`,
      company: visit.drugRep.company,
      providers: visit.providers.map((vp) => `${vp.provider.firstName} ${vp.provider.lastName}`).join("; "),
      scripts7d: counts["scripts7d"],
      scripts14d: counts["scripts14d"],
      scripts30d: counts["scripts30d"],
    });
  }

  const totalVisits = rows.length;
  const avg7d = totalVisits > 0 ? roundTo(rows.reduce((s, r) => s + r.scripts7d, 0) / totalVisits) : 0;
  const avg14d = totalVisits > 0 ? roundTo(rows.reduce((s, r) => s + r.scripts14d, 0) / totalVisits) : 0;
  const avg30d = totalVisits > 0 ? roundTo(rows.reduce((s, r) => s + r.scripts30d, 0) / totalVisits) : 0;

  if (fmt === "csv") {
    return csvResponse(
      toCsv(["visitDate", "repName", "company", "providers", "scripts7d", "scripts14d", "scripts30d"], rows as unknown as Record<string, unknown>[]),
      "script-to-visit.csv"
    );
  }

  return NextResponse.json({ rows, totals: { totalVisits, avg7d, avg14d, avg30d } });
}
