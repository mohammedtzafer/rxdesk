// Report 1.2: Top drugs dispensed
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
    "PRESCRIPTIONS",
    "VIEW"
  );
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(req.url);
  const { startDate, endDate, locationId } = parseDateRange(req);
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "25"), 50);
  const genericOnly = url.searchParams.get("genericOnly") === "true";
  const brandOnly = url.searchParams.get("brandOnly") === "true";
  const format = url.searchParams.get("format");

  const orgId = session.user.organizationId!;

  const genericFilter =
    genericOnly ? { isGeneric: true } : brandOnly ? { isGeneric: false } : {};

  const records = await db.prescriptionRecord.findMany({
    where: {
      organizationId: orgId,
      fillDate: { gte: startDate, lte: endDate },
      ...(locationId ? { locationId } : {}),
      ...genericFilter,
    },
    select: { drugName: true, quantity: true, isGeneric: true },
  });

  // Aggregate by drug name
  const drugMap = new Map<
    string,
    { count: number; totalQty: number; genericCount: number }
  >();

  for (const r of records) {
    const name = r.drugName.trim().toUpperCase();
    const existing = drugMap.get(name) || {
      count: 0,
      totalQty: 0,
      genericCount: 0,
    };
    existing.count += 1;
    existing.totalQty += r.quantity ?? 0;
    if (r.isGeneric) existing.genericCount += 1;
    drugMap.set(name, existing);
  }

  const total = records.length;

  const drugs = Array.from(drugMap.entries())
    .map(([name, stats]) => ({
      name,
      count: stats.count,
      quantity: stats.totalQty,
      genericRate:
        stats.count > 0
          ? roundTo((stats.genericCount / stats.count) * 100)
          : 0,
      percentOfTotal: total > 0 ? roundTo((stats.count / total) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);

  if (format === "csv") {
    const csv = toCsv(
      ["name", "count", "quantity", "genericRate", "percentOfTotal"],
      drugs as Record<string, unknown>[]
    );
    return csvResponse(csv, "top-drugs.csv");
  }

  return NextResponse.json({ drugs, total });
}
