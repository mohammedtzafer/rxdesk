// Report 1.4: Generic dispensing rate (GDR)
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
    "PRESCRIPTIONS",
    "VIEW"
  );
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(req.url);
  const { startDate, endDate, locationId } = parseDateRange(req);
  const providerId = url.searchParams.get("providerId") || undefined;
  const format = url.searchParams.get("format");

  const orgId = session.user.organizationId!;

  const where = {
    organizationId: orgId,
    fillDate: { gte: startDate, lte: endDate },
    ...(locationId ? { locationId } : {}),
    ...(providerId ? { providerId } : {}),
  };

  const records = await db.prescriptionRecord.findMany({
    where,
    select: {
      isGeneric: true,
      fillDate: true,
      providerNpi: true,
      providerId: true,
    },
    orderBy: { fillDate: "asc" },
  });

  const total = records.length;
  const genericCount = records.filter((r) => r.isGeneric).length;
  const gdr = total > 0 ? roundTo((genericCount / total) * 100) : 0;

  // Trend by month
  const trendMap = new Map<string, { generic: number; total: number }>();
  for (const r of records) {
    const period = groupByPeriod(r.fillDate, "month");
    const bucket = trendMap.get(period) || { generic: 0, total: 0 };
    bucket.total += 1;
    if (r.isGeneric) bucket.generic += 1;
    trendMap.set(period, bucket);
  }

  const trend = Array.from(trendMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([period, { generic, total: t }]) => ({
      period,
      gdr: t > 0 ? roundTo((generic / t) * 100) : 0,
    }));

  // By provider NPI
  const providerMap = new Map<
    string,
    { npi: string; generic: number; total: number }
  >();
  for (const r of records) {
    const npi = r.providerNpi;
    const bucket = providerMap.get(npi) || { npi, generic: 0, total: 0 };
    bucket.total += 1;
    if (r.isGeneric) bucket.generic += 1;
    providerMap.set(npi, bucket);
  }

  // Enrich with provider names
  const npis = Array.from(providerMap.keys());
  const providers = await db.provider.findMany({
    where: { organizationId: orgId, npi: { in: npis } },
    select: { npi: true, firstName: true, lastName: true },
  });
  const npiNameMap = new Map(
    providers.map((p) => [p.npi, `${p.firstName} ${p.lastName}`])
  );

  const byProvider = Array.from(providerMap.values())
    .map(({ npi, generic, total: t }) => ({
      npi,
      name: npiNameMap.get(npi) || `NPI ${npi}`,
      gdr: t > 0 ? roundTo((generic / t) * 100) : 0,
      count: t,
    }))
    .sort((a, b) => b.count - a.count);

  if (format === "csv") {
    const csv = toCsv(
      ["npi", "name", "gdr", "count"],
      byProvider as Record<string, unknown>[]
    );
    return csvResponse(csv, "gdr-by-provider.csv");
  }

  return NextResponse.json({ gdr, trend, byProvider });
}
