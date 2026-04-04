// Report 4.1: Hours worked per employee
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

  const entries = await db.timeEntry.findMany({
    where: {
      organizationId: orgId,
      date: { gte: startDate, lte: endDate },
      endTime: { not: null },
      ...(locationId ? { locationId } : {}),
    },
    select: {
      userId: true,
      regularHours: true,
      overtimeHours: true,
      durationMinutes: true,
      user: { select: { name: true, role: true } },
    },
  });

  const employeeMap = new Map<
    string,
    {
      userId: string;
      name: string;
      role: string;
      regularHours: number;
      overtimeHours: number;
      totalMinutes: number;
      entryCount: number;
    }
  >();

  for (const e of entries) {
    const existing = employeeMap.get(e.userId) || {
      userId: e.userId,
      name: e.user.name || "Unknown",
      role: e.user.role,
      regularHours: 0,
      overtimeHours: 0,
      totalMinutes: 0,
      entryCount: 0,
    };
    existing.regularHours += e.regularHours;
    existing.overtimeHours += e.overtimeHours;
    existing.totalMinutes += e.durationMinutes || 0;
    existing.entryCount += 1;
    employeeMap.set(e.userId, existing);
  }

  const rows = Array.from(employeeMap.values())
    .map((emp) => ({
      name: emp.name,
      role: emp.role,
      regularHours: roundTo(emp.regularHours),
      overtimeHours: roundTo(emp.overtimeHours),
      totalHours: roundTo(emp.regularHours + emp.overtimeHours),
      daysWorked: emp.entryCount,
    }))
    .sort((a, b) => b.totalHours - a.totalHours);

  const totalRegular = roundTo(rows.reduce((s, r) => s + r.regularHours, 0));
  const totalOvertime = roundTo(rows.reduce((s, r) => s + r.overtimeHours, 0));
  const totalHours = roundTo(totalRegular + totalOvertime);
  const employeeCount = rows.length;

  if (format === "csv") {
    const csv = toCsv(
      ["name", "role", "regularHours", "overtimeHours", "totalHours", "daysWorked"],
      rows as Record<string, unknown>[]
    );
    return csvResponse(csv, "hours-summary.csv");
  }

  return NextResponse.json({
    rows,
    totals: { totalRegular, totalOvertime, totalHours, employeeCount },
  });
}
