// Report 2.1: Provider scorecard
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

  const records = await db.prescriptionRecord.findMany({
    where: {
      organizationId: orgId,
      fillDate: { gte: startDate, lte: endDate },
      ...locationFilter,
    },
    select: { providerNpi: true, isGeneric: true, payerType: true },
  });

  const total = records.length;

  const providerMap = new Map<
    string,
    { total: number; generic: number; payers: Record<string, number> }
  >();

  for (const r of records) {
    const npi = r.providerNpi;
    const existing = providerMap.get(npi) || { total: 0, generic: 0, payers: {} };
    existing.total += 1;
    if (r.isGeneric) existing.generic += 1;
    existing.payers[r.payerType] = (existing.payers[r.payerType] || 0) + 1;
    providerMap.set(npi, existing);
  }

  const npis = Array.from(providerMap.keys());
  const providers = await db.provider.findMany({
    where: { organizationId: orgId, npi: { in: npis } },
    select: { npi: true, firstName: true, lastName: true, specialty: true },
  });
  const npiMap = new Map(providers.map((p) => [p.npi, p]));

  const rows = Array.from(providerMap.entries())
    .map(([npi, stats]) => {
      const p = npiMap.get(npi);
      return {
        npi,
        name: p ? `${p.firstName} ${p.lastName}` : `NPI ${npi}`,
        specialty: p?.specialty || "—",
        rxCount: stats.total,
        sharePercent: total > 0 ? roundTo((stats.total / total) * 100) : 0,
        gdr: stats.total > 0 ? roundTo((stats.generic / stats.total) * 100) : 0,
        topPayer:
          Object.entries(stats.payers).sort((a, b) => b[1] - a[1])[0]?.[0] ||
          "—",
      };
    })
    .sort((a, b) => b.rxCount - a.rxCount);

  if (format === "csv") {
    const csv = toCsv(
      ["npi", "name", "specialty", "rxCount", "sharePercent", "gdr", "topPayer"],
      rows as Record<string, unknown>[]
    );
    return csvResponse(csv, "provider-scorecard.csv");
  }

  return NextResponse.json({
    rows,
    totals: { totalRx: total, providerCount: rows.length },
  });
}
