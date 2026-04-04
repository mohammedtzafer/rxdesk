import { NextResponse } from "next/server";
import { z } from "zod";
import { checkApiAuth, checkApiModuleAccess } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { writeAuditLog } from "@/lib/audit";

const createProviderSchema = z.object({
  npi: z.string().min(1).max(10),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  suffix: z.string().optional(),
  credential: z.string().optional(),
  specialty: z.string().optional(),
  practiceName: z.string().optional(),
  practiceAddress: z.string().optional(),
  practiceCity: z.string().optional(),
  practiceState: z.string().optional(),
  practiceZip: z.string().optional(),
  practicePhone: z.string().optional(),
  tags: z.array(z.string()).optional(),
  notes: z.string().optional(),
  enrichedFromNppes: z.boolean().optional(),
});

export async function GET(req: Request) {
  const session = await checkApiAuth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { allowed } = await checkApiModuleAccess(session.user.id, "PROVIDERS", "VIEW");
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(req.url);
  const page = parseInt(url.searchParams.get("page") || "1");
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "50"), 100);
  const search = url.searchParams.get("search") || "";
  const specialty = url.searchParams.get("specialty") || "";

  const where: Record<string, unknown> = {
    organizationId: session.user.organizationId,
    isActive: true,
  };

  if (search) {
    where.OR = [
      { firstName: { contains: search, mode: "insensitive" } },
      { lastName: { contains: search, mode: "insensitive" } },
      { npi: { contains: search } },
      { practiceName: { contains: search, mode: "insensitive" } },
    ];
  }

  if (specialty) {
    where.specialty = { contains: specialty, mode: "insensitive" };
  }

  const [providers, total] = await Promise.all([
    db.provider.findMany({
      where,
      orderBy: { lastName: "asc" },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        npi: true,
        firstName: true,
        lastName: true,
        suffix: true,
        credential: true,
        specialty: true,
        practiceName: true,
        practiceCity: true,
        practiceState: true,
        tags: true,
        isActive: true,
        _count: { select: { prescriptionRecords: true } },
      },
    }),
    db.provider.count({ where }),
  ]);

  return NextResponse.json({
    providers,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
}

export async function POST(req: Request) {
  const session = await checkApiAuth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { allowed } = await checkApiModuleAccess(session.user.id, "PROVIDERS", "EDIT");
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const data = createProviderSchema.parse(body);

    // Check plan limits for Starter
    const org = await db.organization.findUnique({
      where: { id: session.user.organizationId },
      select: { plan: true },
    });

    if (org?.plan === "STARTER") {
      const count = await db.provider.count({
        where: { organizationId: session.user.organizationId, isActive: true },
      });
      if (count >= 50) {
        return NextResponse.json(
          { error: "Provider limit reached for Starter plan. Please upgrade." },
          { status: 403 }
        );
      }
    }

    const provider = await db.provider.create({
      data: {
        organizationId: session.user.organizationId,
        npi: data.npi,
        firstName: data.firstName,
        lastName: data.lastName,
        suffix: data.suffix,
        credential: data.credential,
        specialty: data.specialty,
        practiceName: data.practiceName,
        practiceAddress: data.practiceAddress,
        practiceCity: data.practiceCity,
        practiceState: data.practiceState,
        practiceZip: data.practiceZip,
        practicePhone: data.practicePhone,
        tags: data.tags || [],
        notes: data.notes,
        enrichedFromNppes: data.enrichedFromNppes || false,
        lastEnrichedAt: data.enrichedFromNppes ? new Date() : null,
      },
    });

    await writeAuditLog({
      organizationId: session.user.organizationId,
      userId: session.user.id,
      action: "provider.created",
      entityType: "provider",
      entityId: provider.id,
      metadata: { npi: data.npi, name: `${data.firstName} ${data.lastName}` },
    });

    return NextResponse.json(provider, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    // Handle unique constraint violation (duplicate NPI in org)
    if (typeof error === "object" && error !== null && "code" in error && (error as { code: string }).code === "P2002") {
      return NextResponse.json({ error: "A provider with this NPI already exists in your organization" }, { status: 409 });
    }
    console.error("POST /api/providers error:", error);
    return NextResponse.json({ error: "Failed to create provider" }, { status: 500 });
  }
}
