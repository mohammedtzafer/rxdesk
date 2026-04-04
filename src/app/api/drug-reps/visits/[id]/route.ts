import { NextResponse } from "next/server";
import { checkApiAuth, checkApiModuleAccess } from "@/lib/auth-helpers";
import { db } from "@/lib/db";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await checkApiAuth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { allowed } = await checkApiModuleAccess(session.user.id, "DRUG_REPS", "VIEW");
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;

  // Get the visit with all details
  const visit = await db.drugRepVisit.findUnique({
    where: { id, organizationId: session.user.organizationId },
    select: {
      id: true,
      visitDate: true,
      durationMinutes: true,
      drugsPromoted: true,
      samplesLeft: true,
      notes: true,
      followUpDate: true,
      createdAt: true,
      drugRep: { select: { id: true, firstName: true, lastName: true, company: true } },
      providers: {
        select: {
          provider: {
            select: { id: true, firstName: true, lastName: true, npi: true, specialty: true },
          },
        },
      },
    },
  });

  if (!visit) {
    return NextResponse.json({ error: "Visit not found" }, { status: 404 });
  }

  // For each provider discussed, find:
  // 1. The previous visit date that also discussed this provider
  // 2. Rx filled by that provider between previous visit and this visit
  const providerDetails = await Promise.all(
    visit.providers.map(async ({ provider }) => {
      // Find previous visit to this provider by same rep (or any rep)
      const previousVisit = await db.drugRepVisit.findFirst({
        where: {
          organizationId: session.user.organizationId,
          visitDate: { lt: visit.visitDate },
          providers: { some: { providerId: provider.id } },
        },
        orderBy: { visitDate: "desc" },
        select: { id: true, visitDate: true },
      });

      const sinceDate =
        previousVisit?.visitDate ||
        new Date(visit.visitDate.getTime() - 90 * 24 * 60 * 60 * 1000); // default 90 days back

      // Get Rx filled by this provider between sinceDate and visit date
      const rxRecords = await db.prescriptionRecord.findMany({
        where: {
          organizationId: session.user.organizationId,
          providerId: provider.id,
          fillDate: { gte: sinceDate, lte: visit.visitDate },
        },
        select: {
          drugName: true,
          isGeneric: true,
          fillDate: true,
          quantity: true,
          payerType: true,
        },
        orderBy: { fillDate: "desc" },
      });

      // Aggregate by drug
      const drugCounts = new Map<
        string,
        { count: number; totalQty: number; isGeneric: boolean }
      >();
      for (const rx of rxRecords) {
        const name = rx.drugName.toUpperCase().trim();
        const existing = drugCounts.get(name) || {
          count: 0,
          totalQty: 0,
          isGeneric: rx.isGeneric,
        };
        existing.count++;
        existing.totalQty += rx.quantity || 0;
        drugCounts.set(name, existing);
      }

      const rxByDrug = Array.from(drugCounts.entries())
        .map(([name, data]) => ({ name, ...data }))
        .sort((a, b) => b.count - a.count);

      return {
        provider,
        previousVisitDate: previousVisit?.visitDate || null,
        sinceDate,
        totalRxSinceLastVisit: rxRecords.length,
        rxByDrug,
        rxRecords: rxRecords.slice(0, 50), // limit raw records
      };
    })
  );

  return NextResponse.json({
    ...visit,
    providerDetails,
  });
}
