import { NextResponse } from "next/server";
import { checkApiAuth, checkApiModuleAccess } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { calculateTrend } from "@/lib/analytics";

export async function GET(req: Request) {
  const session = await checkApiAuth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { allowed } = await checkApiModuleAccess(session.user.id, "PROVIDERS", "VIEW");
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const url = new URL(req.url);
  const days = parseInt(url.searchParams.get("days") || "90");
  const locationId = url.searchParams.get("locationId") || undefined;
  const sortBy = url.searchParams.get("sortBy") || "change"; // change, volume, decline, growth

  const now = new Date();
  const windowEnd = now;
  const windowStart = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  const priorWindowStart = new Date(windowStart.getTime() - days * 24 * 60 * 60 * 1000);

  const locationFilter = locationId ? { locationId } : {};

  // Get current period volumes per provider
  const currentVolumes = await db.prescriptionRecord.groupBy({
    by: ["providerNpi"],
    where: {
      organizationId: session.user.organizationId,
      fillDate: { gte: windowStart, lte: windowEnd },
      ...locationFilter,
    },
    _count: { id: true },
  });

  // Get prior period volumes per provider
  const priorVolumes = await db.prescriptionRecord.groupBy({
    by: ["providerNpi"],
    where: {
      organizationId: session.user.organizationId,
      fillDate: { gte: priorWindowStart, lt: windowStart },
      ...locationFilter,
    },
    _count: { id: true },
  });

  const priorMap = new Map(priorVolumes.map((p) => [p.providerNpi, p._count.id]));
  const allNpis = new Set([
    ...currentVolumes.map((c) => c.providerNpi),
    ...priorVolumes.map((p) => p.providerNpi),
  ]);

  // Get provider names
  const providers = await db.provider.findMany({
    where: {
      organizationId: session.user.organizationId,
      npi: { in: Array.from(allNpis) },
    },
    select: { npi: true, firstName: true, lastName: true, specialty: true, tags: true },
  });
  const providerMap = new Map(providers.map((p) => [p.npi, p]));

  // Build analysis results
  const results = Array.from(allNpis).map((npi) => {
    const current = currentVolumes.find((c) => c.providerNpi === npi)?._count.id || 0;
    const prior = priorMap.get(npi) || 0;
    const { direction, percentChange } = calculateTrend(current, prior);
    const providerInfo = providerMap.get(npi);

    return {
      npi,
      name: providerInfo
        ? `${providerInfo.firstName} ${providerInfo.lastName}`
        : `NPI ${npi}`,
      specialty: providerInfo?.specialty || null,
      tags: providerInfo?.tags || [],
      currentVolume: current,
      priorVolume: prior,
      absoluteChange: current - prior,
      percentChange,
      trend: direction,
    };
  });

  // Sort
  switch (sortBy) {
    case "growth":
      results.sort((a, b) => b.percentChange - a.percentChange);
      break;
    case "decline":
      results.sort((a, b) => a.percentChange - b.percentChange);
      break;
    case "volume":
      results.sort((a, b) => b.currentVolume - a.currentVolume);
      break;
    default: // "change" — absolute change descending
      results.sort((a, b) => Math.abs(b.absoluteChange) - Math.abs(a.absoluteChange));
      break;
  }

  // Summary
  const growing = results.filter((r) => r.trend === "UP").length;
  const declining = results.filter((r) => r.trend === "DOWN").length;
  const stable = results.filter((r) => r.trend === "STABLE").length;
  const totalCurrent = results.reduce((s, r) => s + r.currentVolume, 0);
  const totalPrior = results.reduce((s, r) => s + r.priorVolume, 0);
  const overallTrend = calculateTrend(totalCurrent, totalPrior);

  return NextResponse.json({
    providers: results,
    summary: {
      totalProviders: results.length,
      growing,
      declining,
      stable,
      totalCurrentVolume: totalCurrent,
      totalPriorVolume: totalPrior,
      overallTrend: overallTrend.direction,
      overallChange: overallTrend.percentChange,
    },
    days,
  });
}
