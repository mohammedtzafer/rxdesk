// Report 4.3: Scheduled hours vs actual hours logged
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
  const locationFilter = locationId ? { locationId } : {};

  const [shifts, entries] = await Promise.all([
    db.shiftAssignment.findMany({
      where: {
        organizationId: orgId,
        date: { gte: startDate, lte: endDate },
        ...locationFilter,
      },
      select: {
        employeeId: true,
        hours: true,
        date: true,
      },
    }),
    db.timeEntry.findMany({
      where: {
        organizationId: orgId,
        date: { gte: startDate, lte: endDate },
        endTime: { not: null },
        ...locationFilter,
      },
      select: {
        userId: true,
        regularHours: true,
        overtimeHours: true,
        user: { select: { name: true, role: true } },
      },
    }),
  ]);

  // Scheduled hours per employee
  const scheduledMap = new Map<string, number>();
  for (const s of shifts) {
    scheduledMap.set(s.employeeId, (scheduledMap.get(s.employeeId) || 0) + s.hours);
  }

  // Actual hours per employee with name
  const actualMap = new Map<string, { name: string; role: string; actual: number }>();
  for (const e of entries) {
    const existing = actualMap.get(e.userId) || {
      name: e.user.name || "Unknown",
      role: e.user.role,
      actual: 0,
    };
    existing.actual += e.regularHours + e.overtimeHours;
    actualMap.set(e.userId, existing);
  }

  const allIds = new Set([...scheduledMap.keys(), ...actualMap.keys()]);

  // Enrich unmatched IDs with user names
  const unmatchedIds = Array.from(allIds).filter((id) => !actualMap.has(id));
  const users =
    unmatchedIds.length > 0
      ? await db.user.findMany({
          where: { id: { in: unmatchedIds } },
          select: { id: true, name: true, role: true },
        })
      : [];
  const userMap = new Map(users.map((u) => [u.id, u]));

  const rows = Array.from(allIds)
    .map((userId) => {
      const scheduled = roundTo(scheduledMap.get(userId) || 0);
      const actualData = actualMap.get(userId);
      const actual = roundTo(actualData?.actual || 0);
      const u = userMap.get(userId);
      return {
        name: actualData?.name || u?.name || userId,
        role: actualData?.role || u?.role || "—",
        scheduledHours: scheduled,
        actualHours: actual,
        variance: roundTo(actual - scheduled),
        variancePercent:
          scheduled > 0 ? roundTo(((actual - scheduled) / scheduled) * 100) : 0,
      };
    })
    .sort((a, b) => Math.abs(b.variance) - Math.abs(a.variance));

  const totalScheduled = roundTo(rows.reduce((s, r) => s + r.scheduledHours, 0));
  const totalActual = roundTo(rows.reduce((s, r) => s + r.actualHours, 0));
  const totalVariance = roundTo(totalActual - totalScheduled);

  if (format === "csv") {
    const csv = toCsv(
      ["name", "role", "scheduledHours", "actualHours", "variance", "variancePercent"],
      rows as Record<string, unknown>[]
    );
    return csvResponse(csv, "schedule-vs-actual.csv");
  }

  return NextResponse.json({
    rows,
    totals: { totalScheduled, totalActual, totalVariance },
  });
}
