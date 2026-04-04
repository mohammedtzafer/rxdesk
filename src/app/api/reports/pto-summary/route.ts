// Report 4.4: PTO summary by type and employee
import { NextResponse } from "next/server";
import { checkApiAuth, checkApiModuleAccess } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import {
  parseDateRange,
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
  const { startDate, endDate } = parseDateRange(req);
  const format = url.searchParams.get("format");

  const orgId = session.user.organizationId!;

  const requests = await db.ptoRequest.findMany({
    where: {
      organizationId: orgId,
      startDate: { gte: startDate, lte: endDate },
    },
    select: {
      employeeId: true,
      type: true,
      status: true,
      startDate: true,
      endDate: true,
    },
  });

  // Enrich with user names
  const employeeIds = [...new Set(requests.map((r) => r.employeeId))];
  const users = await db.user.findMany({
    where: { id: { in: employeeIds } },
    select: { id: true, name: true, role: true },
  });
  const userMap = new Map(users.map((u) => [u.id, u]));

  // Compute days per request (inclusive)
  const daysBetween = (start: Date, end: Date) => {
    const ms = end.getTime() - start.getTime();
    return Math.max(1, Math.round(ms / (1000 * 60 * 60 * 24)) + 1);
  };

  // Aggregate per employee
  const empMap = new Map<
    string,
    {
      name: string;
      role: string;
      byType: Record<string, { days: number; requests: number }>;
    }
  >();

  for (const r of requests) {
    if (r.status === "DENIED") continue;
    const existing = empMap.get(r.employeeId) || {
      name: userMap.get(r.employeeId)?.name || r.employeeId,
      role: userMap.get(r.employeeId)?.role || "—",
      byType: {},
    };
    const days = daysBetween(r.startDate, r.endDate);
    const bucket = existing.byType[r.type] || { days: 0, requests: 0 };
    bucket.days += days;
    bucket.requests += 1;
    existing.byType[r.type] = bucket;
    empMap.set(r.employeeId, existing);
  }

  const rows = Array.from(empMap.values())
    .map((emp) => ({
      name: emp.name,
      role: emp.role,
      vacationDays: emp.byType["VACATION"]?.days || 0,
      sickDays: emp.byType["SICK"]?.days || 0,
      personalDays: emp.byType["PERSONAL"]?.days || 0,
      otherDays: emp.byType["OTHER"]?.days || 0,
      totalDays: Object.values(emp.byType).reduce((s, b) => s + b.days, 0),
      totalRequests: Object.values(emp.byType).reduce((s, b) => s + b.requests, 0),
    }))
    .sort((a, b) => b.totalDays - a.totalDays);

  const totalRequests = requests.filter((r) => r.status !== "DENIED").length;
  const approvedCount = requests.filter((r) => r.status === "APPROVED").length;
  const pendingCount = requests.filter((r) => r.status === "PENDING").length;
  const totalDays = rows.reduce((s, r) => s + r.totalDays, 0);

  if (format === "csv") {
    const csv = toCsv(
      ["name", "role", "vacationDays", "sickDays", "personalDays", "otherDays", "totalDays"],
      rows as Record<string, unknown>[]
    );
    return csvResponse(csv, "pto-summary.csv");
  }

  return NextResponse.json({
    rows,
    totals: { totalRequests, approvedCount, pendingCount, totalDays },
  });
}
