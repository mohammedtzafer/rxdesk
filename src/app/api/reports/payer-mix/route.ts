// Report 1.3: Payer mix analysis
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

const PAYER_TYPES = ["COMMERCIAL", "MEDICARE", "MEDICAID", "CASH", "OTHER"] as const;
type PayerKey = (typeof PAYER_TYPES)[number];

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

  const { startDate, endDate, locationId } = parseDateRange(req);
  const url = new URL(req.url);
  const format = url.searchParams.get("format");

  const orgId = session.user.organizationId!;

  const records = await db.prescriptionRecord.findMany({
    where: {
      organizationId: orgId,
      fillDate: { gte: startDate, lte: endDate },
      ...(locationId ? { locationId } : {}),
    },
    select: { payerType: true, fillDate: true },
    orderBy: { fillDate: "asc" },
  });

  const total = records.length;

  // Overall mix
  const payerCounts = new Map<string, number>();
  for (const r of records) {
    payerCounts.set(r.payerType, (payerCounts.get(r.payerType) || 0) + 1);
  }

  const mix = PAYER_TYPES.map((type) => ({
    type,
    count: payerCounts.get(type) || 0,
    percent:
      total > 0
        ? roundTo(((payerCounts.get(type) || 0) / total) * 100)
        : 0,
  }));

  // Trend by month
  const trendMap = new Map<string, Record<PayerKey, number>>();
  for (const r of records) {
    const period = groupByPeriod(r.fillDate, "month");
    if (!trendMap.has(period)) {
      trendMap.set(period, {
        COMMERCIAL: 0,
        MEDICARE: 0,
        MEDICAID: 0,
        CASH: 0,
        OTHER: 0,
      });
    }
    const bucket = trendMap.get(period)!;
    const key = r.payerType as PayerKey;
    if (key in bucket) bucket[key] += 1;
  }

  const trend = Array.from(trendMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([period, counts]) => ({ period, ...counts }));

  if (format === "csv") {
    const csv = toCsv(
      ["type", "count", "percent"],
      mix as Record<string, unknown>[]
    );
    return csvResponse(csv, "payer-mix.csv");
  }

  return NextResponse.json({ mix, trend });
}
