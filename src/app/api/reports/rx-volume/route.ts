// Report 1.1: Prescription volume trend
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
    "PRESCRIPTIONS",
    "VIEW"
  );
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(req.url);
  const { startDate, endDate, locationId } = parseDateRange(req);
  const groupBy = (url.searchParams.get("groupBy") || "day") as
    | "day"
    | "week"
    | "month";
  const format = url.searchParams.get("format");

  const orgId = session.user.organizationId!;
  const locationFilter = locationId ? { locationId } : {};

  // Current period records
  const records = await db.prescriptionRecord.findMany({
    where: {
      organizationId: orgId,
      fillDate: { gte: startDate, lte: endDate },
      ...locationFilter,
    },
    select: { fillDate: true },
    orderBy: { fillDate: "asc" },
  });

  // Prior period for overall change calculation
  const periodMs = endDate.getTime() - startDate.getTime();
  const priorStart = new Date(startDate.getTime() - periodMs);
  const priorEnd = new Date(startDate.getTime() - 1);

  const priorCount = await db.prescriptionRecord.count({
    where: {
      organizationId: orgId,
      fillDate: { gte: priorStart, lte: priorEnd },
      ...locationFilter,
    },
  });

  // Group by period
  const buckets = new Map<string, number>();
  for (const r of records) {
    const key = groupByPeriod(r.fillDate, groupBy);
    buckets.set(key, (buckets.get(key) || 0) + 1);
  }

  const periods = Array.from(buckets.keys()).sort();
  const data = periods.map((period, i) => {
    const count = buckets.get(period)!;
    const prevCount = i > 0 ? buckets.get(periods[i - 1])! : null;
    return {
      period,
      count,
      change: prevCount !== null ? percentChange(count, prevCount) : null,
    };
  });

  const total = records.length;
  const dayCount = Math.max(
    1,
    Math.round(periodMs / (1000 * 60 * 60 * 24))
  );
  const avg = roundTo(total / dayCount, 1);

  if (format === "csv") {
    const csv = toCsv(["period", "count", "change"], data as Record<string, unknown>[]);
    return csvResponse(csv, "rx-volume.csv");
  }

  return NextResponse.json({
    data,
    totals: {
      total,
      avg,
      change: percentChange(total, priorCount),
    },
  });
}
