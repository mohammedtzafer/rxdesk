import { NextResponse } from "next/server";
import { checkApiAuth, checkApiModuleAccess } from "@/lib/auth-helpers";
import { db } from "@/lib/db";

export async function GET(req: Request) {
  const session = await checkApiAuth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { allowed } = await checkApiModuleAccess(session.user.id, "PRESCRIPTIONS", "VIEW");
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Suppress unused variable warning — req used only for auth context
  void req;

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

  // New prescribers: NPIs in last 30 days not seen before that
  const recentNpis = await db.prescriptionRecord.groupBy({
    by: ["providerNpi"],
    where: {
      organizationId: session.user.organizationId,
      fillDate: { gte: thirtyDaysAgo },
    },
  });

  const olderNpis = await db.prescriptionRecord.groupBy({
    by: ["providerNpi"],
    where: {
      organizationId: session.user.organizationId,
      fillDate: { lt: thirtyDaysAgo },
    },
  });

  const olderNpiSet = new Set(olderNpis.map((r) => r.providerNpi));
  const newPrescriberNpis = recentNpis
    .map((r) => r.providerNpi)
    .filter((npi) => !olderNpiSet.has(npi));

  // Get names for new prescribers
  const newPrescriberDetails = await db.provider.findMany({
    where: {
      organizationId: session.user.organizationId,
      npi: { in: newPrescriberNpis },
    },
    select: { npi: true, firstName: true, lastName: true, specialty: true },
  });

  // Dormant prescribers: NPIs in 30-60 day window not seen in last 30 days
  const recentNpiSet = new Set(recentNpis.map((r) => r.providerNpi));
  const midRangeNpis = await db.prescriptionRecord.groupBy({
    by: ["providerNpi"],
    where: {
      organizationId: session.user.organizationId,
      fillDate: { gte: sixtyDaysAgo, lt: thirtyDaysAgo },
    },
  });

  const dormantNpis = midRangeNpis
    .map((r) => r.providerNpi)
    .filter((npi) => !recentNpiSet.has(npi));

  const dormantDetails = await db.provider.findMany({
    where: {
      organizationId: session.user.organizationId,
      npi: { in: dormantNpis },
    },
    select: { npi: true, firstName: true, lastName: true, specialty: true },
  });

  return NextResponse.json({
    newPrescribers: newPrescriberDetails.map((p) => ({
      npi: p.npi,
      name: `${p.firstName} ${p.lastName}`,
      specialty: p.specialty,
    })),
    dormantPrescribers: dormantDetails.map((p) => ({
      npi: p.npi,
      name: `${p.firstName} ${p.lastName}`,
      specialty: p.specialty,
    })),
    newPrescriberNpis: newPrescriberNpis.filter(
      (npi) => !newPrescriberDetails.some((p) => p.npi === npi)
    ), // unmatched NPIs (no provider record yet)
  });
}
