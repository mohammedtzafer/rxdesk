// Report 3.1: Drug rep visit activity
import { NextResponse } from "next/server";
import { checkApiAuth, checkApiModuleAccess } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import {
  parseDateRange,
  roundTo,
  toCsv,
  csvResponse,
} from "@/lib/report-utils";

export async function GET(req: Request) {
  const session = await checkApiAuth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { allowed } = await checkApiModuleAccess(
    session.user.id,
    "REPORTS",
    "VIEW"
  );
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(req.url);
  const { startDate, endDate, locationId } = parseDateRange(req);
  const format = url.searchParams.get("format");

  const orgId = session.user.organizationId!;

  const visits = await db.drugRepVisit.findMany({
    where: {
      organizationId: orgId,
      visitDate: { gte: startDate, lte: endDate },
      ...(locationId ? { locationId } : {}),
    },
    select: {
      drugRepId: true,
      visitDate: true,
      durationMinutes: true,
      drugsPromoted: true,
      samplesLeft: true,
      drugRep: {
        select: { firstName: true, lastName: true, company: true, territory: true },
      },
    },
    orderBy: { visitDate: "desc" },
  });

  // Aggregate per rep
  const repMap = new Map<
    string,
    {
      id: string;
      name: string;
      company: string;
      territory: string;
      visitCount: number;
      totalMinutes: number;
      drugs: Set<string>;
      lastVisit: string;
    }
  >();

  for (const v of visits) {
    const repId = v.drugRepId;
    const existing = repMap.get(repId) || {
      id: repId,
      name: `${v.drugRep.firstName} ${v.drugRep.lastName}`,
      company: v.drugRep.company,
      territory: v.drugRep.territory || "—",
      visitCount: 0,
      totalMinutes: 0,
      drugs: new Set<string>(),
      lastVisit: "",
    };
    existing.visitCount += 1;
    existing.totalMinutes += v.durationMinutes || 0;
    const promoted = Array.isArray(v.drugsPromoted) ? v.drugsPromoted : [];
    for (const d of promoted as string[]) existing.drugs.add(d);
    const dateStr = v.visitDate.toISOString().split("T")[0];
    if (!existing.lastVisit || dateStr > existing.lastVisit) {
      existing.lastVisit = dateStr;
    }
    repMap.set(repId, existing);
  }

  const rows = Array.from(repMap.values())
    .map((r) => ({
      repId: r.id,
      name: r.name,
      company: r.company,
      territory: r.territory,
      visitCount: r.visitCount,
      avgDurationMin:
        r.visitCount > 0 ? roundTo(r.totalMinutes / r.visitCount) : 0,
      uniqueDrugs: r.drugs.size,
      lastVisit: r.lastVisit,
    }))
    .sort((a, b) => b.visitCount - a.visitCount);

  const totalVisits = visits.length;
  const uniqueReps = rows.length;
  const avgVisitsPerRep =
    uniqueReps > 0 ? roundTo(totalVisits / uniqueReps) : 0;

  if (format === "csv") {
    const csv = toCsv(
      ["name", "company", "territory", "visitCount", "avgDurationMin", "uniqueDrugs", "lastVisit"],
      rows as Record<string, unknown>[]
    );
    return csvResponse(csv, "rep-activity.csv");
  }

  return NextResponse.json({
    rows,
    totals: { totalVisits, uniqueReps, avgVisitsPerRep },
  });
}
