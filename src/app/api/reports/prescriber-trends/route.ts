// Report 2.2: Prescriber volume trends
import { NextResponse } from "next/server";
import { checkApiAuth, checkApiModuleAccess } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import {
  parseDateRange,
  groupByPeriod,
  percentChange,
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
  const locationFilter = locationId ? { locationId } : {};

  const periodMs = endDate.getTime() - startDate.getTime();
  const priorStart = new Date(startDate.getTime() - periodMs);

  const [currentRecords, priorRecords] = await Promise.all([
    db.prescriptionRecord.findMany({
      where: {
        organizationId: orgId,
        fillDate: { gte: startDate, lte: endDate },
        ...locationFilter,
      },
      select: { providerNpi: true, fillDate: true },
    }),
    db.prescriptionRecord.findMany({
      where: {
        organizationId: orgId,
        fillDate: { gte: priorStart, lt: startDate },
        ...locationFilter,
      },
      select: { providerNpi: true },
    }),
  ]);

  // Per-provider current counts
  const currentMap = new Map<string, number>();
  for (const r of currentRecords) {
    currentMap.set(r.providerNpi, (currentMap.get(r.providerNpi) || 0) + 1);
  }

  // Per-provider prior counts
  const priorMap = new Map<string, number>();
  for (const r of priorRecords) {
    priorMap.set(r.providerNpi, (priorMap.get(r.providerNpi) || 0) + 1);
  }

  const npis = Array.from(
    new Set([...currentMap.keys(), ...priorMap.keys()])
  );

  const providers = await db.provider.findMany({
    where: { organizationId: orgId, npi: { in: npis } },
    select: { npi: true, firstName: true, lastName: true, specialty: true },
  });
  const npiMap = new Map(providers.map((p) => [p.npi, p]));

  const rows = npis
    .map((npi) => {
      const current = currentMap.get(npi) || 0;
      const prior = priorMap.get(npi) || 0;
      const p = npiMap.get(npi);
      return {
        npi,
        name: p ? `${p.firstName} ${p.lastName}` : `NPI ${npi}`,
        specialty: p?.specialty || "—",
        currentCount: current,
        priorCount: prior,
        change: percentChange(current, prior),
      };
    })
    .sort((a, b) => b.currentCount - a.currentCount);

  // Monthly trend across all providers
  const trendMap = new Map<string, number>();
  for (const r of currentRecords) {
    const period = groupByPeriod(r.fillDate, "month");
    trendMap.set(period, (trendMap.get(period) || 0) + 1);
  }
  const trend = Array.from(trendMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([period, count]) => ({ period, count }));

  const totalRx = currentRecords.length;
  const activeProviders = rows.filter((r) => r.currentCount > 0).length;
  const avgPerProvider =
    activeProviders > 0 ? roundTo(totalRx / activeProviders) : 0;

  if (format === "csv") {
    const csv = toCsv(
      ["npi", "name", "specialty", "currentCount", "priorCount", "change"],
      rows as Record<string, unknown>[]
    );
    return csvResponse(csv, "prescriber-trends.csv");
  }

  return NextResponse.json({
    rows,
    trend,
    totals: { totalRx, activeProviders, avgPerProvider },
  });
}
