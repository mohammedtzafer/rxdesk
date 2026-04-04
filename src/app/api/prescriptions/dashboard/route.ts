import { NextResponse } from "next/server";
import { checkApiAuth, checkApiModuleAccess } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { calculateTrend, calculateConcentrationRisk } from "@/lib/analytics";

export async function GET(req: Request) {
  const session = await checkApiAuth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { allowed } = await checkApiModuleAccess(session.user.id, "PRESCRIPTIONS", "VIEW");
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(req.url);
  const days = parseInt(url.searchParams.get("days") || "90");
  const locationId = url.searchParams.get("locationId") || undefined;

  const now = new Date();
  const windowStart = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  const priorWindowStart = new Date(windowStart.getTime() - days * 24 * 60 * 60 * 1000);

  const locationFilter = locationId ? { locationId } : {};

  // Get current and prior period counts
  const [currentTotal, priorTotal] = await Promise.all([
    db.prescriptionRecord.count({
      where: {
        organizationId: session.user.organizationId,
        fillDate: { gte: windowStart, lte: now },
        ...locationFilter,
      },
    }),
    db.prescriptionRecord.count({
      where: {
        organizationId: session.user.organizationId,
        fillDate: { gte: priorWindowStart, lt: windowStart },
        ...locationFilter,
      },
    }),
  ]);

  const trend = calculateTrend(currentTotal, priorTotal);

  // Top prescribers
  const providerVolumes = await db.prescriptionRecord.groupBy({
    by: ["providerNpi"],
    where: {
      organizationId: session.user.organizationId,
      fillDate: { gte: windowStart, lte: now },
      ...locationFilter,
    },
    _count: { id: true },
    orderBy: { _count: { id: "desc" } },
    take: 10,
  });

  // Get provider names for top prescribers
  const topNpis = providerVolumes.map((p) => p.providerNpi);
  const providerNames = await db.provider.findMany({
    where: {
      organizationId: session.user.organizationId,
      npi: { in: topNpis },
    },
    select: { npi: true, firstName: true, lastName: true },
  });
  const npiNameMap = new Map(providerNames.map((p) => [p.npi, `${p.firstName} ${p.lastName}`]));

  const topPrescribers = providerVolumes.map((p) => ({
    npi: p.providerNpi,
    name: npiNameMap.get(p.providerNpi) || `NPI ${p.providerNpi}`,
    count: p._count.id,
  }));

  // Concentration risk
  const allProviderVolumes = await db.prescriptionRecord.groupBy({
    by: ["providerNpi"],
    where: {
      organizationId: session.user.organizationId,
      fillDate: { gte: windowStart, lte: now },
      ...locationFilter,
    },
    _count: { id: true },
  });

  const concentration = calculateConcentrationRisk(
    allProviderVolumes.map((p) => ({ npi: p.providerNpi, count: p._count.id }))
  );

  // Active provider count
  const activeProviders = await db.provider.count({
    where: { organizationId: session.user.organizationId, isActive: true },
  });

  return NextResponse.json({
    totalRx: currentTotal,
    priorTotalRx: priorTotal,
    trend,
    topPrescribers,
    concentrationRisk: concentration,
    activeProviders,
    days,
  });
}
