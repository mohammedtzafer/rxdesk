import { NextResponse } from "next/server";
import { checkApiAuth, checkApiModuleAccess } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { parseDateRange, roundTo, toCsv, csvResponse } from "@/lib/report-utils";

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
      fillDate: { gte: startDate, lte: endDate },
      status: { not: null },
    },
    select: {
      drugName: true,
      drugNdc: true,
      isGeneric: true,
      status: true,
      providerId: true,
      provider: { select: { firstName: true, lastName: true, npi: true } },
    },
  });

  const drugMap = new Map<string, { name: string; ndc: string; total: number; billed: number; filed: number; unbilled: number; isBrand: boolean }>();
  for (const rx of rxRecords) {
    const key = rx.drugNdc || rx.drugName.toUpperCase().trim();
    const existing = drugMap.get(key) || {
      name: rx.drugName,
      ndc: rx.drugNdc || "—",
      total: 0,
      billed: 0,
      filed: 0,
      unbilled: 0,
      isBrand: !rx.isGeneric,
    };
    existing.total++;
    if (rx.status === "B") existing.billed++;
    else if (rx.status === "F") existing.filed++;
    else if (rx.status === "U") existing.unbilled++;
    drugMap.set(key, existing);
  }

  const rows = Array.from(drugMap.values())
    .map((d) => ({
      drug: d.name.slice(0, 60),
      ndc: d.ndc,
      brand: d.isBrand ? "Y" : "N",
      total: d.total,
      billed: d.billed,
      filed: d.filed,
      unbilled: d.unbilled,
      filedRate: d.total > 0 ? roundTo((d.filed / d.total) * 100) : 0,
    }))
    .sort((a, b) => b.filedRate - a.filedRate);

  const totalScripts = rxRecords.length;
  const totalFiled = rxRecords.filter((r) => r.status === "F").length;
  const overallFiledRate = totalScripts > 0 ? roundTo((totalFiled / totalScripts) * 100) : 0;

  if (fmt === "csv") {
    return csvResponse(
      toCsv(["drug", "ndc", "brand", "total", "billed", "filed", "unbilled", "filedRate"], rows as unknown as Record<string, unknown>[]),
      "filed-away-analysis.csv"
    );
  }

  return NextResponse.json({ rows: rows.slice(0, 200), totals: { totalScripts, totalFiled, overallFiledRate } });
}
