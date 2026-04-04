// Report 5.1: Fill-to-pickup time analysis
import { NextResponse } from "next/server";
import { checkApiAuth, checkApiModuleAccess } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import {
  parseDateRange,
  roundTo,
  groupByPeriod,
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

  const events = await db.prescriptionEvent.findMany({
    where: {
      organizationId: orgId,
      readyAt: { not: null },
      pickedUpAt: { not: null },
      createdAt: { gte: startDate, lte: endDate },
      ...(locationId ? { locationId } : {}),
    },
    select: {
      drugName: true,
      readyAt: true,
      pickedUpAt: true,
      createdAt: true,
    },
  });

  if (events.length === 0) {
    return NextResponse.json({
      rows: [],
      trend: [],
      totals: { avgMinutes: 0, medianMinutes: 0, totalEvents: 0, under1Hour: 0 },
    });
  }

  // Compute wait times in minutes
  const withWait = events.map((e) => ({
    date: e.createdAt,
    drugName: e.drugName,
    waitMinutes: Math.round(
      (e.pickedUpAt!.getTime() - e.readyAt!.getTime()) / 60000
    ),
  }));

  // Filter out negative/zero (data errors)
  const valid = withWait.filter((e) => e.waitMinutes > 0);

  const total = valid.length;
  const avgMinutes = roundTo(valid.reduce((s, e) => s + e.waitMinutes, 0) / total);

  const sorted = [...valid].sort((a, b) => a.waitMinutes - b.waitMinutes);
  const mid = Math.floor(sorted.length / 2);
  const medianMinutes =
    sorted.length % 2 === 0
      ? roundTo((sorted[mid - 1].waitMinutes + sorted[mid].waitMinutes) / 2)
      : sorted[mid].waitMinutes;

  const under1Hour = valid.filter((e) => e.waitMinutes <= 60).length;

  // Drug-level breakdown
  const drugMap = new Map<string, { minutes: number; count: number }>();
  for (const e of valid) {
    const name = e.drugName.trim().toUpperCase();
    const existing = drugMap.get(name) || { minutes: 0, count: 0 };
    existing.minutes += e.waitMinutes;
    existing.count += 1;
    drugMap.set(name, existing);
  }

  const rows = Array.from(drugMap.entries())
    .map(([drugName, stats]) => ({
      drugName,
      avgWaitMinutes: roundTo(stats.minutes / stats.count),
      fillCount: stats.count,
    }))
    .sort((a, b) => b.fillCount - a.fillCount)
    .slice(0, 50);

  // Weekly trend
  const trendMap = new Map<string, { minutes: number; count: number }>();
  for (const e of valid) {
    const period = groupByPeriod(e.date, "week");
    const existing = trendMap.get(period) || { minutes: 0, count: 0 };
    existing.minutes += e.waitMinutes;
    existing.count += 1;
    trendMap.set(period, existing);
  }

  const trend = Array.from(trendMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([period, { minutes, count }]) => ({
      period,
      avgWaitMinutes: roundTo(minutes / count),
    }));

  if (format === "csv") {
    const csv = toCsv(
      ["drugName", "avgWaitMinutes", "fillCount"],
      rows as Record<string, unknown>[]
    );
    return csvResponse(csv, "fill-to-pickup.csv");
  }

  return NextResponse.json({
    rows,
    trend,
    totals: { avgMinutes, medianMinutes, totalEvents: total, under1Hour },
  });
}
