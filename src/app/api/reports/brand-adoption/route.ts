import { NextResponse } from "next/server";
import { checkApiAuth, checkApiModuleAccess } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { parseDateRange, toCsv, csvResponse } from "@/lib/report-utils";

export async function GET(req: Request) {
  const session = await checkApiAuth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { allowed } = await checkApiModuleAccess(session.user.id, "REPORTS", "VIEW");
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { startDate, endDate } = parseDateRange(req);
  const url = new URL(req.url);
  const fmt = url.searchParams.get("format");
  const orgId = session.user.organizationId!;

  const rxRecords = await db.prescriptionRecord.findMany({
    where: {
      organizationId: orgId,
      isGeneric: false,
      fillDate: { gte: startDate, lte: endDate },
    },
    select: {
      drugName: true,
      drugNdc: true,
      fillDate: true,
      providerId: true,
      status: true,
      provider: { select: { firstName: true, lastName: true, npi: true } },
    },
    orderBy: { fillDate: "asc" },
  });

  const drugProviderMap = new Map<string, Map<string, { name: string; npi: string; firstDate: string; total: number; billed: number }>>();

  for (const rx of rxRecords) {
    const drugKey = rx.drugNdc || rx.drugName.toUpperCase().trim();
    if (!drugProviderMap.has(drugKey)) drugProviderMap.set(drugKey, new Map());
    const provMap = drugProviderMap.get(drugKey)!;
    const provId = rx.providerId || "unknown";
    const existing = provMap.get(provId) || {
      name: rx.provider ? `${rx.provider.firstName} ${rx.provider.lastName}` : "Unknown",
      npi: rx.provider?.npi || "—",
      firstDate: rx.fillDate.toISOString().split("T")[0],
      total: 0,
      billed: 0,
    };
    existing.total++;
    if (rx.status === "B" || !rx.status) existing.billed++;
    if (rx.fillDate.toISOString() < existing.firstDate) {
      existing.firstDate = rx.fillDate.toISOString().split("T")[0];
    }
    provMap.set(provId, existing);
  }

  const rows: Array<{ drug: string; provider: string; npi: string; firstPrescribed: string; totalScripts: number; billedScripts: number }> = [];
  for (const [drug, provMap] of drugProviderMap) {
    for (const [, prov] of provMap) {
      rows.push({
        drug: drug.slice(0, 60),
        provider: prov.name,
        npi: prov.npi,
        firstPrescribed: prov.firstDate,
        totalScripts: prov.total,
        billedScripts: prov.billed,
      });
    }
  }
  rows.sort((a, b) => b.totalScripts - a.totalScripts);

  const uniqueDrugs = drugProviderMap.size;
  const uniqueProviders = new Set(rxRecords.map((r) => r.providerId).filter(Boolean)).size;
  const totalScripts = rxRecords.length;

  if (fmt === "csv") {
    return csvResponse(
      toCsv(["drug", "provider", "npi", "firstPrescribed", "totalScripts", "billedScripts"], rows as unknown as Record<string, unknown>[]),
      "brand-adoption.csv"
    );
  }

  return NextResponse.json({ rows: rows.slice(0, 200), totals: { uniqueDrugs, uniqueProviders, totalScripts } });
}
