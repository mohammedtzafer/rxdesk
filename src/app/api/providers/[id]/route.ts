import { NextResponse } from "next/server";
import { z } from "zod";
import { checkApiAuth, checkApiModuleAccess } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { writeAuditLog } from "@/lib/audit";

const updateProviderSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  suffix: z.string().nullable().optional(),
  credential: z.string().nullable().optional(),
  specialty: z.string().nullable().optional(),
  practiceName: z.string().nullable().optional(),
  practiceAddress: z.string().nullable().optional(),
  practiceCity: z.string().nullable().optional(),
  practiceState: z.string().nullable().optional(),
  practiceZip: z.string().nullable().optional(),
  practicePhone: z.string().nullable().optional(),
  tags: z.array(z.string()).optional(),
  notes: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
});

export async function GET(
  _req: Request,
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

  const provider = await db.provider.findUnique({
    where: { id, organizationId: session.user.organizationId },
    select: {
      id: true,
      npi: true,
      firstName: true,
      lastName: true,
      suffix: true,
      credential: true,
      specialty: true,
      practiceName: true,
      practiceAddress: true,
      practiceCity: true,
      practiceState: true,
      practiceZip: true,
      practicePhone: true,
      tags: true,
      notes: true,
      isActive: true,
      enrichedFromNppes: true,
      lastEnrichedAt: true,
      createdAt: true,
      _count: { select: { prescriptionRecords: true } },
      addresses: {
        select: {
          id: true,
          label: true,
          address: true,
          city: true,
          state: true,
          zip: true,
          isPrimary: true,
          source: true,
        },
        orderBy: [{ isPrimary: "desc" as const }, { createdAt: "asc" as const }],
      },
    },
  });

  if (!provider) {
    return NextResponse.json({ error: "Provider not found" }, { status: 404 });
  }

  return NextResponse.json(provider);
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await checkApiAuth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { allowed } = await checkApiModuleAccess(session.user.id, "PROVIDERS", "EDIT");
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { id } = await params;
    const body = await req.json();
    const data = updateProviderSchema.parse(body);

    const provider = await db.provider.update({
      where: { id, organizationId: session.user.organizationId },
      data,
    });

    await writeAuditLog({
      organizationId: session.user.organizationId,
      userId: session.user.id,
      action: "provider.updated",
      entityType: "provider",
      entityId: id,
      metadata: data,
    });

    return NextResponse.json(provider);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    console.error("PUT /api/providers/[id] error:", error);
    return NextResponse.json({ error: "Failed to update provider" }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await checkApiAuth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { allowed } = await checkApiModuleAccess(session.user.id, "PROVIDERS", "FULL");
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  await db.provider.update({
    where: { id, organizationId: session.user.organizationId },
    data: { isActive: false },
  });

  await writeAuditLog({
    organizationId: session.user.organizationId,
    userId: session.user.id,
    action: "provider.deactivated",
    entityType: "provider",
    entityId: id,
  });

  return NextResponse.json({ success: true });
}
