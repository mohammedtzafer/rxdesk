// Report 4.2: Overtime analysis
import { NextResponse } from "next/server";
import { checkApiAuth, checkApiModuleAccess } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import {
  parseDateRange,
  groupByPeriod,
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

  const entries = await db.timeEntry.findMany({
    where: {
      organizationId: orgId,
      date: { gte: startDate, lte: endDate },
      overtimeHours: { gt: 0 },
      endTime: { not: null },
      ...(locationId ? { locationId } : {}),
    },
    select: {
      userId: true,
      overtimeHours: true,
      date: true,
      payRateId: true,
      user: { select: { name: true, role: true } },
      payRate: { select: { ratePerHour: true } },
    },
  });

  // Per-employee OT
  const employeeMap = new Map<
    string,
    { name: string; role: string; otHours: number; estimatedCost: number }
  >();

  for (const e of entries) {
    const existing = employeeMap.get(e.userId) || {
      name: e.user.name || "Unknown",
      role: e.user.role,
      otHours: 0,
      estimatedCost: 0,
    };
    existing.otHours += e.overtimeHours;
    const rate = e.payRate ? Number(e.payRate.ratePerHour) : 0;
    existing.estimatedCost += e.overtimeHours * rate * 1.5; // OT at 1.5x
    employeeMap.set(e.userId, existing);
  }

  const rows = Array.from(employeeMap.entries())
    .map(([, stats]) => ({
      name: stats.name,
      role: stats.role,
      otHours: roundTo(stats.otHours),
      estimatedCost: roundTo(stats.estimatedCost),
    }))
    .sort((a, b) => b.otHours - a.otHours);

  // OT trend by week
  const trendMap = new Map<string, number>();
  for (const e of entries) {
    const period = groupByPeriod(e.date, "week");
    trendMap.set(period, roundTo((trendMap.get(period) || 0) + e.overtimeHours));
  }
  const trend = Array.from(trendMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([period, otHours]) => ({ period, otHours }));

  const totalOtHours = roundTo(rows.reduce((s, r) => s + r.otHours, 0));
  const totalEstCost = roundTo(rows.reduce((s, r) => s + r.estimatedCost, 0));
  const employeesWithOt = rows.length;

  if (format === "csv") {
    const csv = toCsv(
      ["name", "role", "otHours", "estimatedCost"],
      rows as Record<string, unknown>[]
    );
    return csvResponse(csv, "overtime-analysis.csv");
  }

  return NextResponse.json({
    rows,
    trend,
    totals: { totalOtHours, totalEstCost, employeesWithOt },
  });
}
