import { NextResponse } from "next/server";
import { checkApiAuth, checkApiModuleAccess } from "@/lib/auth-helpers";
import { db } from "@/lib/db";

export async function GET(req: Request) {
  const session = await checkApiAuth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { allowed } = await checkApiModuleAccess(session.user.id, "PRESCRIPTIONS", "VIEW");
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const url = new URL(req.url);
  const page = parseInt(url.searchParams.get("page") || "1");
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "50"), 100);
  const eventType = url.searchParams.get("eventType") || undefined;
  const locationId = url.searchParams.get("locationId") || undefined;

  const where: Record<string, unknown> = {
    organizationId: session.user.organizationId,
  };
  if (eventType) where.eventType = eventType;
  if (locationId) where.locationId = locationId;

  const [events, total] = await Promise.all([
    db.prescriptionEvent.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        eventType: true,
        drugName: true,
        drugNdc: true,
        providerNpi: true,
        providerName: true,
        quantity: true,
        fillDate: true,
        readyAt: true,
        pickedUpAt: true,
        payerName: true,
        copay: true,
        source: true,
        createdAt: true,
        patient: {
          select: { id: true, firstName: true, lastName: true, phone: true },
        },
      },
    }),
    db.prescriptionEvent.count({ where }),
  ]);

  return NextResponse.json({
    events,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
}
