import { NextResponse } from "next/server";
import { z } from "zod";
import { checkApiAuth, checkApiModuleAccess } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { writeAuditLog } from "@/lib/audit";

const createVisitSchema = z.object({
  drugRepId: z.string().min(1),
  visitDate: z.string().min(1),
  locationId: z.string().optional(),
  durationMinutes: z.number().int().positive().optional(),
  providerIds: z.array(z.string()).optional(),
  drugsPromoted: z
    .array(
      z.object({
        name: z.string(),
        ndc: z.string().optional(),
        notes: z.string().optional(),
      })
    )
    .optional(),
  samplesLeft: z
    .array(
      z.object({
        name: z.string(),
        quantity: z.number().int().optional(),
        lot: z.string().optional(),
        expiration: z.string().optional(),
      })
    )
    .optional(),
  notes: z.string().optional(),
  followUpDate: z.string().optional(),
});

export async function GET(req: Request) {
  const session = await checkApiAuth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { allowed } = await checkApiModuleAccess(session.user.id, "DRUG_REPS", "VIEW");
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const url = new URL(req.url);
  const page = parseInt(url.searchParams.get("page") || "1");
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "25"), 100);
  const drugRepId = url.searchParams.get("drugRepId") || undefined;

  const where: Record<string, unknown> = { organizationId: session.user.organizationId };
  if (drugRepId) where.drugRepId = drugRepId;

  const [visits, total] = await Promise.all([
    db.drugRepVisit.findMany({
      where,
      orderBy: { visitDate: "desc" },
      skip: (page - 1) * limit,
      take: limit,
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
            provider: { select: { id: true, firstName: true, lastName: true, npi: true } },
          },
        },
      },
    }),
    db.drugRepVisit.count({ where }),
  ]);

  return NextResponse.json({ visits, total, page, totalPages: Math.ceil(total / limit) });
}

export async function POST(req: Request) {
  const session = await checkApiAuth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { allowed } = await checkApiModuleAccess(session.user.id, "DRUG_REPS", "EDIT");
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const body = await req.json();
    const data = createVisitSchema.parse(body);

    // Enforce Starter plan visit limit
    const org = await db.organization.findUnique({
      where: { id: session.user.organizationId },
      select: { plan: true },
    });

    if (org?.plan === "STARTER") {
      const thisMonth = new Date();
      thisMonth.setDate(1);
      thisMonth.setHours(0, 0, 0, 0);
      const visitCount = await db.drugRepVisit.count({
        where: {
          organizationId: session.user.organizationId,
          createdAt: { gte: thisMonth },
        },
      });
      if (visitCount >= 10) {
        return NextResponse.json(
          { error: "Visit limit reached for Starter plan (10/month). Please upgrade." },
          { status: 403 }
        );
      }
    }

    const visit = await db.drugRepVisit.create({
      data: {
        organizationId: session.user.organizationId,
        drugRepId: data.drugRepId,
        visitDate: new Date(data.visitDate),
        locationId: data.locationId,
        durationMinutes: data.durationMinutes,
        drugsPromoted: data.drugsPromoted ?? [],
        samplesLeft: data.samplesLeft ?? [],
        notes: data.notes,
        followUpDate: data.followUpDate ? new Date(data.followUpDate) : null,
        loggedById: session.user.id,
        providers:
          data.providerIds?.length
            ? {
                createMany: {
                  data: data.providerIds.map((providerId) => ({ providerId })),
                },
              }
            : undefined,
      },
    });

    await writeAuditLog({
      organizationId: session.user.organizationId,
      userId: session.user.id,
      action: "drug_rep_visit.created",
      entityType: "drugRepVisit",
      entityId: visit.id,
      metadata: {
        drugRepId: data.drugRepId,
        visitDate: data.visitDate,
        providerCount: data.providerIds?.length ?? 0,
      },
    });

    return NextResponse.json(visit, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    console.error("POST /api/drug-reps/visits error:", error);
    return NextResponse.json({ error: "Failed to log visit" }, { status: 500 });
  }
}
