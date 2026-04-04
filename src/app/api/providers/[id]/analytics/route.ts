import { NextResponse } from "next/server";
import { checkApiAuth, checkApiModuleAccess } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { calculateProviderAnalytics } from "@/lib/analytics";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await checkApiAuth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { allowed } = await checkApiModuleAccess(session.user.id, "PROVIDERS", "VIEW");
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const url = new URL(req.url);
  const days = parseInt(url.searchParams.get("days") || "90");

  const provider = await db.provider.findUnique({
    where: { id, organizationId: session.user.organizationId },
    select: { id: true, npi: true },
  });

  if (!provider) {
    return NextResponse.json({ error: "Provider not found" }, { status: 404 });
  }

  const now = new Date();
  const windowEnd = now;
  const windowStart = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  const priorWindowStart = new Date(windowStart.getTime() - days * 24 * 60 * 60 * 1000);

  const [currentRecords, priorRecords] = await Promise.all([
    db.prescriptionRecord.findMany({
      where: {
        organizationId: session.user.organizationId,
        providerId: id,
        fillDate: { gte: windowStart, lte: windowEnd },
      },
      select: {
        fillDate: true,
        drugName: true,
        isGeneric: true,
        payerType: true,
        quantity: true,
      },
    }),
    db.prescriptionRecord.findMany({
      where: {
        organizationId: session.user.organizationId,
        providerId: id,
        fillDate: { gte: priorWindowStart, lt: windowStart },
      },
      select: {
        fillDate: true,
        drugName: true,
        isGeneric: true,
        payerType: true,
        quantity: true,
      },
    }),
  ]);

  const analytics = calculateProviderAnalytics(currentRecords, priorRecords, days);

  return NextResponse.json(analytics);
}
